import { NextApiRequest, NextApiResponse } from 'next';

import { createVideoClip, getVideoClipsByVId, updateVideoClip } from 'models/videoClips';
import { getSession } from '@/lib/session';
import axios from 'axios';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';



export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  const { method } = req;

  try {
    switch (method) {
      case 'POST':
        await handlePOST(req, res);
        break;
      case 'PUT': // Add PUT method to handle updates
        await handlePUT(req, res);
        break;
      default:
        res.setHeader('Allow', 'GET, POST, PUT');
        res.status(405).json({
          error: { message: `Method ${method} Not Allowed` },
        });
    }
  } catch (error: any) {
    const message = error.message || 'Something went wrong';
    const status = error.status || 500;
    res.status(status).json({ error: { message } });
  }
}

// Handle POST request to create a video
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
  const { conVideoId, clip_id, exportId, videoId,videoIdForClips }: any = req.body;
  if(videoIdForClips){
    const getVideoClips = await getVideoClipsByVId(videoIdForClips);
    if (getVideoClips) {
      res
        .status(200)
        .json({ status: 'true', message: 'video clip created', data: getVideoClips });
    } else {
      res.json({ status: 'false', message: 'video clip created', data: {} });
    }

  }

  if(videoId){
  const getVideo = await createVideoClip({
    conVideoId,
    clip_id,
    exportId,
    videoId,
  });
  if (getVideo) {
    res
      .status(200)
      .json({ status: 'true', message: 'video clip created', data: getVideo });
  } else {
    res.json({ status: 'false', message: 'video clip created', data: {} });
  }
};
}

const downloadVideo = async (url, outputPath) => {
  const writer = fs.createWriteStream(outputPath);

  const response = await axios({
    url,
    method: 'GET',
    responseType: 'stream'
  });

  response.data.pipe(writer);

  return new Promise((resolve, reject) => {
    writer.on('finish', resolve);
    writer.on('error', reject);
  });
};


const addBackgroundMusic = async (videoPath: string, audioPath: string, outputPath: string) => {
  return new Promise((resolve, reject) => {
    ffmpeg()
      .addInput(videoPath)
      .addInput(audioPath)
      .complexFilter([
        '[0:a][1:a]amix=inputs=2:duration=first:dropout_transition=2[a]'
      ])
      .outputOptions(['-map 0:v', '-map [a]', '-c:v copy', '-shortest'])
      .saveToFile(outputPath)
      .on('end', resolve)
      .on('error', reject);
  });
};

const handlePUT = async (req: NextApiRequest, res: NextApiResponse) => {
  const { exportArray }: any = req.body;
  const session = await getSession(req, res);
  const backgroundMusicPath = path.join(process.cwd(), 'public', 'background_music.mp3'); // Path to your background music file

  try {
    const exportParse = JSON.parse(exportArray);
    console.log(exportParse);
    let countForRes = 0;

    for (const clip of exportParse) {
      const userDirectory = path.join(process.cwd(), 'public', 'videos', `user_${session?.user.id}`, 'file');
      if (!fs.existsSync(userDirectory)) {
        fs.mkdirSync(userDirectory, { recursive: true });
      }

      const fileName = `video_${Date.now()}.mp4`;
      const outputPath = path.join(userDirectory, fileName);
      const finalOutputPath = path.join(userDirectory, `final_${fileName}`);

      await downloadVideo(clip.src_url, outputPath);

      // Add background music
      await addBackgroundMusic(outputPath, backgroundMusicPath, finalOutputPath);

      const updateVideo = await updateVideoClip({
        title: clip.name,
        src_url: `/videos/user_${session?.user.id}/file/final_${fileName}`,
        clip_id: clip.id,
      });

      if (updateVideo) {
        countForRes++;
      }
    }

    if (countForRes === exportParse.length) {
      countForRes = 0;
      res.status(200).json({ status: 'true', message: 'Video clips updated', data: {} });
    } else {
      res.status(500).json({ status: 'false', message: 'Not all video clips were updated', data: {} });
    }

  } catch (error) {
    console.error('Error updating video clips:', error);
    res.status(500).json({ status: 'false', message: 'Video clips not updated', data: {} });
  }
};