import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import fs from 'fs'; // Use fs for synchronous file checks
import path from 'path';
import { prisma } from '@/lib/prisma';
import { createVideo } from 'models/uploadedVideo';
import { getAllVideosForCurrentUser } from 'models/uploadedVideo';
import formidable, { File as FormidableFile } from 'formidable';

// Disable Next.js body parser to handle `multipart/form-data` with formidable
export const config = {
  api: {
    bodyParser: false,
  },
};

let globalTimestamp: string;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { method } = req;

  switch (method) {
    case 'POST':
      await handlePOST(req, res);
      break;
    case 'GET':
      await handleGET(req, res);
      break;
    default:
      res.setHeader('Allow', ['GET', 'POST']);
      res.status(405).json({
        status: 'false',
        message: `Method ${method} Not Allowed`,
      });
  }
}

async function handlePOST(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ status: 'false', message: 'Unauthorized' });
  }

  const form = formidable({ multiples: false });

  form.parse(req, async (err, fields, files) => {
    if (err) {
      return res.status(500).json({ status: 'false', message: 'Error parsing form data' });
    }

    const file = Array.isArray(files.file) ? files.file[0] : (files.file as FormidableFile | undefined);

    if (!file) {
      return res.status(400).json({ status: 'false', message: 'No file uploaded' });
    }

    const userId = session.user.id.toString();

    // Check Subscription
    const subscription = await prisma.subscriptions.findFirst({
      where: {
        user_id: session.user.id,
        status: true,
      },
      include: {
        subscriptionPackage: true,
      },
    });

    if (!subscription) {
      return res.json({ status: 'subscription required', message: 'payment required', data: 'payment' });
    }

    // Check subscription limits
    const latestSubscriptionUsage = await prisma.subscriptionUsage.findFirst({
      where: {
        subscriptions_id: subscription.id,
      },
      orderBy: {
        createdAt: 'desc',
      },
    });

    if (
      subscription.subscriptionPackage &&
      latestSubscriptionUsage &&
      (latestSubscriptionUsage.upload_count >= subscription.subscriptionPackage.upload_video_limit ||
        latestSubscriptionUsage.clip_count >= subscription.subscriptionPackage.generate_clips)
    ) {
      return res.json({ status: 'subscription limit end', message: 'payment required', data: 'payment' });
    }


    const videosDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(videosDir)) {
  fs.mkdirSync(videosDir, { recursive: true });  // creates the directory if it doesn't exist
}

    globalTimestamp = new Date().toISOString().replace(/[-:.]/g, ''); // Set the global timestamp

    const videoName = file.originalFilename?.replace(/\.[^/.]+$/, "");
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos', userId, `${videoName}_${globalTimestamp}`);

    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    } else {
      return res.json({ status: 'file exist', message: 'File already exists' });
    }

    const newFilePath = path.join(uploadDir, `${videoName}_${globalTimestamp}${path.extname(file.originalFilename || '')}`);

    // Move the uploaded file to the designated folder
    fs.renameSync(file.filepath, newFilePath);

    // Create the database path using the same structure
    const dbPath = `videos/${userId}/${videoName}_${globalTimestamp}/${videoName}_${globalTimestamp}${path.extname(file.originalFilename || '')}`;
    
    const videoDuration = 0; // Add logic to calculate video duration if needed

    const videoUploaded = await createVideo({ link: dbPath, userId: session.user.id, duration: videoDuration });

    if (videoUploaded) {
      return res.status(200).json({ status: 'url inserted', message: 'Video created', data: videoUploaded });
    } else {
      return res.json({ status: 'false', message: 'Video not created' });
    }
  });
}

async function handleGET(req: NextApiRequest, res: NextApiResponse) {
  const session = await getSession(req, res);

  try {
    const videos = await getAllVideosForCurrentUser({ userId: session?.user.id });

    const subscription = await prisma.subscriptions.findFirst({
      where: {
        user_id: session?.user.id,
        status: true,
      },
      include: {
        subscriptionPackage: true,
      },
    });

    const maxVideoLengthFromDB = subscription?.subscriptionPackage?.max_length_video;

    res.status(200).json({
      status: 'true',
      message: 'get all videos',
      data: videos,
      maxVideoLengthFromDB,
    });
  } catch (error) {
    res.json({ status: 'false', message: 'something went wrong' });
  }
}
