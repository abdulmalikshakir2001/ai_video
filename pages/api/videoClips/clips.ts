import { NextApiRequest, NextApiResponse } from 'next';

import {   createVideoClip } from 'models/videoClips';
import { getSession } from '@/lib/session';
import { prisma } from '@/lib/prisma';
import fs from 'fs';
import path from 'path';
import { spawn } from 'child_process';

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
      default:
        res.setHeader('Allow', ['POST']);
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
      const {  videoId, toggleStates}: any = req.body;
      const {  io}: any = req;


      let {  originalLink}: any = req.body;
      originalLink = `/${originalLink}`

      

      const session = await getSession(req,res)
      //  check usage
const subscription = await prisma.subscriptions.findFirst({
  where: {
    user_id: session?.user.id,
    status: true,
  },
  include: {
    subscriptionPackage: true,
  },
});

if (!subscription) {
  return  res.json({ status: 'false', message: 'payment required', data: 'payment' });
}
const latestSubscriptionUsage:any = await prisma.subscriptionUsage.findFirst({
  where: {
    subscriptions_id: subscription.id,
  },
  orderBy: {
    createdAt: 'desc',
  },
});

if (
  subscription.subscriptionPackage &&
  (latestSubscriptionUsage.upload_count >= subscription.subscriptionPackage.upload_video_limit ||
    latestSubscriptionUsage.clip_count >= subscription.subscriptionPackage.generate_clips)
) {
  return res.json({ status: 'false', message: 'payment required', data: 'payment' });
}

//  check usage
      

// Extract the file name without the extension
// Output the result
      const cleanedOriginalLink = originalLink.startsWith('/') ? originalLink.substring(1) : originalLink;
     const absoluteFilePath = path.join(process.cwd(), 'uploads', cleanedOriginalLink); // path for config options
     const folderPath = path.dirname(absoluteFilePath);
    
// Output both variables
console.log('Absolute file path:', absoluteFilePath); // This gives you the full path including the file
console.log('Folder path:', folderPath); 
      const pathParts = originalLink.split('/videos/')[1].split('/');
    const firstVar = pathParts[0];
    const secondVar = pathParts[1];
    const dirPath = path.join(process.cwd(), 'uploads', 'videos', firstVar, secondVar, 'clips');
    try {
      // Check if the directory exists, if not create it
      if (!fs.existsSync(dirPath)) {
        fs.mkdirSync(dirPath, { recursive: true });
      }
      
    const config = {
      device: "cpu",
      video_file: absoluteFilePath,
      audio_file: "audio.mp3", // audio file name
      output_folder: dirPath,
      batch_size: 16,
      compute_type: "int8",
      srt_file: "srt.srt",
      ass_file: "ass.ass",
      output_video: "output.mp4",
      emoji: false , //toggleStates.magicEmoji
      emoji_position: { x: "(W-w)/2", y: "(H-h)/2" },
      min_words: 4,
      max_words: 8,
      image_folder:path.join(process.cwd(), 'file_gallary'),
      image_size: 70,
      font: {
        fontname: "Arial",
        fontsize: 20,
        primary_color: "&H00FFFFFF",
        highlight_color: "&H0000FF00",
        outline_color: "&H00000000",
        back_color: "&H00000000",
        highlight_bg_color: "&H00FFC0CB",
        bold: -1,
        italic: 0,
        underline: 0,
        strike_out: 0,
        scale_x: 100,
        scale_y: 100,
        spacing: 0,
        angle: 0,
        border_style: 1,
        outline: 2,
        shadow: 1,
        alignment: 2,
        margin_l: 10,
        margin_r: 10,
        margin_v: 10,
        encoding: 0
      },
      background_music: toggleStates.magicMusic,
      music_volume: 1.0,
      music_file:path.join(process.cwd(), 'file_music'),
      cropping: toggleStates.magicFrame,
      pyannote_auth_token: process.env.PYANNOTE_AUTH_TOKEN,
      aspect_ratio: [9, 16]
    };
    const pythonScriptPath = path.join(process.cwd(), 'video_processing.py');


// Convert the config to JSON and pass it to Python script
// const pythonProcess = spawn('python', [pythonScriptPath, JSON.stringify(config)]);
console.log('spawn process begins to start')
const pythonProcess = spawn(path.join(process.cwd(), 'myenv', 'Scripts', 'python.exe'), [pythonScriptPath, JSON.stringify(config)]);
console.log('spawn process begins to start')



// Listen for data from Python script
pythonProcess.stdout.on('data', (data) => {
    console.log(`${data.toString()}`);
});

// Listen for errors
pythonProcess.stderr.on('data', (data) => {
    console.error(`Error: ${data.toString()}`);
});

// Handle the close event
pythonProcess.on('close', async () => {
  try {
    const normalizedDirPath = dirPath.replace(/\\/g, '/'); // Replace backslashes with forward slashes
const startIndex = normalizedDirPath.indexOf('/videos');
const endIndex = normalizedDirPath.indexOf('/clips') + '/clips'.length;
let extractedPath = normalizedDirPath.substring(startIndex, endIndex);
if (extractedPath.startsWith('/')) {
  extractedPath = extractedPath.substring(1);
}
    // Read all files from the directory
    const files = fs.readdirSync(dirPath);
    // Regular expression to match files with numbers before '.mp4'
    const regexMp4 = /_\d+\.mp4$/;
    const regexSrt = /_\d+_srt\.srt$/;
    // const regexAss = /_\d+_ass\.ass$/;
    const regexTran = /_\d+_transcription\.json$/;
    const regexAudio = /_\d+_audio\.mp3$/;
    // const regexSubtitled = /_\d+_output\.mp4$/;

    // Filter files and map them according to their types
    const clipsArray = files
      .filter(file => regexMp4.test(file))
      .map(file => {
        const baseName = file.replace(/\.mp4$/, ''); // Extract the base name like 'clip_1'

        // Look for associated files based on the prefix (e.g., clip_1)
        const srtFile = files.find(f => f.startsWith(baseName) && regexSrt.test(f));
        // const assFile = files.find(f => f.startsWith(baseName) && regexAss.test(f));
        const tranFile = files.find(f => f.startsWith(baseName) && regexTran.test(f));
        const audioFile = files.find(f => f.startsWith(baseName) && regexAudio.test(f));
        // const subtitledFile = files.find(f => f.startsWith(baseName) && regexSubtitled.test(f));
        return {
          clipSrc: path.join(extractedPath, file), // Full path for clip
          srtSrc: srtFile ? path.join(extractedPath, srtFile) : null, // Full path for .srt
          // assSrc: assFile ? path.join(extractedPath, assFile) : null, // Full path for .ass
          tranSrc: tranFile ? path.join(extractedPath, tranFile) : null, 
          audioSrc: audioFile ? path.join(extractedPath, audioFile) : null, // Full path for .wav
          // clipSubtitledSrc: subtitledFile ? path.join(extractedPath, subtitledFile) : null, // Full path for subtitled .mp4
        };
      });
      

    // Loop through the array and store each clip and its associated paths in the database
    for (const clipData of clipsArray) {
      // Insert each clip's details into the database
      await createVideoClip({
        clipSrc: clipData.clipSrc,
        srtSrc: clipData.srtSrc,
        assSrc:'ass.ass',   //clipData.assSrc,
        tranSrc:clipData.tranSrc,   
        audioSrc: clipData.audioSrc,
        clipSubtitledSrc:'subtitled.mp4',  //clipData.clipSubtitledSrc,
        videoId: videoId,
        config:config
      });
    }

     await prisma.subscriptionUsage.update({
      where: {
        id: latestSubscriptionUsage.id,
      },
      data: {
        clip_count: latestSubscriptionUsage.clip_count + clipsArray.length,
        upload_count: latestSubscriptionUsage.upload_count + 1,
      },
    });

     await prisma.uploadedVideo.update({
      where: {
        id: +videoId, // Replace `id` with the actual id of the video you want to update
      },
      data: {
        clipsCreated: true,
      },
    });
    
    io.emit('videoClipUpdate');

    console.log('All video clips and associated files have been processed and stored successfully.');
    return res.status(200).json({ statusMessage:'clips created', message: 'video clips and associated files created' });
  } catch (err) {
    console.error('Error while processing video clips and associated files:', err);
  }
});




      // python code end 
      return false;
    } catch (error) {
      res.status(500).json({ message: 'Failed to upload file', error: 'error exist' });
    }
      console.log(firstVar)
      return false;
}


