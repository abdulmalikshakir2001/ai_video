import { NextApiRequest, NextApiResponse } from 'next';
import { getSession } from '@/lib/session';
import fs from 'fs';
import path from 'path';
import { prisma } from '@/lib/prisma';
// import  ytdl  from '@distube/ytdl-core';
import ytdlp from 'ytdlp-nodejs';

// import ffmpeg from 'fluent-ffmpeg';
import { createVideo, getAllVideos, updateConVideoIdField } from 'models/uploadedVideo';

interface ExtendedNextApiRequest extends NextApiRequest {
  fileValidationError?: string | null;
}

const extractVideoId = (url: string) => {
  const regex = /(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:[^/\n\s]+\/\S+\/|(?:v|e(?:mbed)?)\/|\S*?[?&]v=)|youtu\.be\/)([a-zA-Z0-9_-]{11})/;
  const match = url.match(regex);
  return match ? match[1] : null;
};

// const getVideoDuration = async (videoId: string): Promise<number | null> => {
//   try {
//     const info = await ytdl.getInfo(videoId);
//     const duration = info.videoDetails.lengthSeconds;
//     return duration ? parseInt(duration) : null;
//   } catch (error) {
//     console.error('Error fetching video duration:', error);
//     return null;
//   }
// };

let globalTimestamp: string;

export default async function handler(req: ExtendedNextApiRequest, res: NextApiResponse) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'GET':
        await handleGET(req, res);
        break;
      case 'PUT':
        await handlePUT(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, PUT');
        res.status(405).json({
          status: 'false',
          message: `Method ${method} Not Allowed`,
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ status: 'false', message });
  }
}
const handlePOST = async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
  const { origionalVideoLink } = req.body;
  console.log(origionalVideoLink);
  const session = await getSession(req, res);
  if (!session) {
    return res.status(401).json({ status: 'false', message: 'Unauthorized' });
  }

  const userId = session.user.id.toString();

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
    return res.json({ status: 'false', message: 'payment required', data: 'payment' });
  }

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
    return res.json({ status: 'false', message: 'payment required', data: 'payment' });
  }
 
  globalTimestamp = new Date().toISOString().replace(/[-:.]/g, ''); // Set the global timestamp
  if (typeof origionalVideoLink === 'string') {
    const videoId = extractVideoId(origionalVideoLink);
    if (!videoId) {
      res.status(400).json({ status: 'false', message: 'Invalid YouTube URL' });
      return;
    }

    // const videoDuration = await getVideoDuration(videoId);

    // if (videoDuration === null) {
    //   res.status(500).json({ status: 'false', message: 'Failed to get video duration' });
    //   return;
    // }

    // const maxVideoLengthFromDB = subscription.subscriptionPackage?.max_length_video;
    // let maxVideoLengthInSeconds = 0;
    // if (maxVideoLengthFromDB) {
    //   maxVideoLengthInSeconds = timeStringToSeconds(maxVideoLengthFromDB);
    // }

    // if (videoDuration >= maxVideoLengthInSeconds) {
    //   return res.status(403).json({
    //     status: 'false',
    //     message: 'Video length exceeds the maximum allowed length for your subscription package',
    //     data: 'video_length_exceeded',
    //   });
    // }

    // Download and save video using ytdl-core and ffmpeg
    const videosDir = path.join(process.cwd(), 'uploads');
    if (!fs.existsSync(videosDir)) {
      fs.mkdirSync(videosDir, { recursive: true });  // creates the directory if it doesn't exist
    }
    
    const videoName = `${videoId}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'videos', userId, `${videoName}_${globalTimestamp}`);
    
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }
    
    // const videoPath = path.join(uploadDir, `${videoName}.mp4`);
    // const audioPath = path.join(uploadDir, `${videoName}.m4a`);
    const outputPath = path.join(uploadDir, `${videoName}_${globalTimestamp}.mp4`);
    const dbPath = `videos/${userId}/${videoName}_${globalTimestamp}/${videoName}_${globalTimestamp}.mp4`;

    

    const file = fs.createWriteStream(outputPath);

try {
  // Download the video synchronously
  await new Promise<void>((resolve, reject) => {
     ytdlp
      .stream(origionalVideoLink, {
        filter: "audioandvideo",
        quality: "highest",
      })
      .on("error", (err) => {
        console.error("Error during download:", err);
        reject(err); // Reject the promise if an error occurs
      })
      .pipe(file);

    // Resolve the promise when the download is complete
    file.on("close", () => {
      console.log("Download complete. File saved at:", outputPath);
      resolve();
    });
  });

  // Perform the database operation after download is complete
  const videoUploaded = await createVideo({ link: dbPath, userId: session.user.id });

  if (videoUploaded) {
    // Return the response after the database operation
    return res.status(200).json({ status: "true", message: "Video created", data: videoUploaded });
  } else {
    return res.status(500).json({ status: "false", message: "Video not created" });
  }
} catch (error) {
  console.error("Error:", error);
  return res.status(500).json({ status: "false", message: "Error processing request", error });
}

    

    
  
    
    // const videoStream = ytdl(videoId, { quality: 'highestvideo' });
    // const audioStream = ytdl(videoId, { quality: 'highestaudio' });
    
    // videoStream.pipe(fs.createWriteStream(videoPath));
    // audioStream.pipe(fs.createWriteStream(audioPath));
    
    // Promise.all([
    //   new Promise((resolve) => videoStream.on('finish', resolve)),
    //   new Promise((resolve) => audioStream.on('finish', resolve))
    // ]).then(() => {
    //   // Merge video and audio using ffmpeg
    //   ffmpeg()
    //     .input(videoPath)
    //     .input(audioPath)
    //     .videoCodec('copy')
    //     .audioCodec('aac')
    //     .output(outputPath)
    //     .on('end', async () => {
    //       console.log('Merging finished!');

    //       // Delete the temporary files
    //       fs.unlink(videoPath, (err) => {
    //         if (err) throw err;
    //         console.log('Video file deleted');
    //       });
    //       fs.unlink(audioPath, (err) => {
    //         if (err) throw err;
    //         console.log('Audio file deleted');
    //       });

    //       const videoUploaded = await createVideo({ link: dbPath, userId: session.user.id });
    //       if (videoUploaded) {
    //         res.status(200).json({ status: 'true', message: 'Video created', data: videoUploaded });
    //       } else {
    //         res.json({ status: 'false', message: 'Video not created' });
    //       }
    //     })
    //     .on('error', (err) => {
    //       console.error('Error during merging:', err);
    //       res.status(500).json({ status: 'false', message: 'Error during merging', error: err });
    //     })
    //     .run();
    // }).catch((err) => {
    //   console.error(err);
    //   res.status(500).json({ status: 'false', message: 'Error downloading video', error: err });
    // });

    return;
  }
};


const handlePUT = async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
  const { conVideoId, videoId } = req.body;
  const session = await getSession(req, res);
  try {
    const updatedVideo = await updateConVideoIdField({ id: videoId, userId: session?.user.id, conVideoId });
    if (updatedVideo) {
      const latestActiveSubscription = await prisma.subscriptions.findFirst({
        where: {
          user_id: session?.user.id,
          status: true,
        },
        orderBy: {
          createdAt: 'desc',
        },
      });

      if (latestActiveSubscription) {
        const subscriptionId = latestActiveSubscription.id;

        const latestSubscriptionUsage = await prisma.subscriptionUsage.findFirst({
          where: {
            subscriptions_id: subscriptionId,
          },
          orderBy: {
            createdAt: 'desc',
          },
        });

        if (latestSubscriptionUsage) {
          await prisma.subscriptionUsage.update({
            where: {
              id: latestSubscriptionUsage.id,
            },
            data: {
              upload_count: latestSubscriptionUsage.upload_count + 1,
            },
          });
        }
      }
    }
    res.status(200).json({ status: 'true', message: 'Video updated', data: updatedVideo });
  } catch (error) {
    res.json({ status: 'false', message: 'convideoField not updated' });
  }
};

const handleGET = async (req: ExtendedNextApiRequest, res: NextApiResponse) => {
  const session = await getSession(req, res);

  try {
    const videos = await getAllVideos({ userId: session?.user.id });

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
};

// function timeStringToSeconds(timeString: string): number {
//   const [hours, minutes, seconds] = timeString.split(':').map(Number);
//   return hours * 3600 + minutes * 60 + seconds;
// }
