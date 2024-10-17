import { NextApiRequest, NextApiResponse } from 'next';
import path from 'path';
import fs from 'fs';
// import { spawn } from 'child_process';

import { exec } from 'child_process';




export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    const { method } = req;
  
    try {
      switch (method) {
        case 'POST':
          if (req.body.subtitleStyle && req.body.videoClipPath) {
            // Handle video processing with subtitle overlay
            await handlePOST(req, res);
          } else {
            res.status(400).json({ error: 'Subtitle style and video clip path are required' });
          }
          break;
        default:
          res.setHeader('Allow', 'POST');
          res.status(405).json({ error: `Method ${method} Not Allowed` });
      }
    } catch (error: any) {
      console.error('Error processing video:', error);
      res.status(500).json({ error: 'Failed to process video' });
    }
  }

// Utility function to create the .ass file content
// Utility function to create the .ass file content
function createAssFile(transcriptionData: any, subtitleStyle: any) {
    const transcription = JSON.parse(transcriptionData);
  
    let assContent = `
  [Script Info]
  Title: ${subtitleStyle.title || 'Subtitles'}
  ScriptType: v4.00+
  Collisions: Normal
  PlayDepth: 0
  
  [V4+ Styles]
  Format: Name, Fontname, Fontsize, PrimaryColour, BackColour, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
  Style: Default,${subtitleStyle.fontFamily},${subtitleStyle.fontSize},&H${subtitleStyle.currentWordColor.replace('#', '')},&H${subtitleStyle.currentWordBg.replace('#', '')},1,1,0,2,10,10,${subtitleStyle.bottom},0
  
  [Events]
  Format: Layer, Start, End, Style, Text
  `;
  
    // Iterate through each transcription segment
    transcription.segments.forEach((segment: any) => {
      const words = segment.words;
      
      // Group words in sets of three
      for (let i = 0; i < words.length; i += 3) {
        const wordGroup = words.slice(i, i + 3);
        
        // Set the start time as the start of the first word and end time as the end of the last word in the group
        const groupStartTime = formatTime(wordGroup[0].start);
        const groupEndTime = formatTime(wordGroup[wordGroup.length - 1].end);
        
        // Join the words in the group to form the subtitle text
        const subtitleText = wordGroup.map((word: any) => word.word).join(' ');
  
        // Add the subtitle event to the .ass file content
        assContent += `Dialogue: 0,${groupStartTime},${groupEndTime},Default,,0,0,0,,${subtitleText}\n`;
      }
    });
  
    return assContent;
  }
  
  // Utility function to format time for .ass file
  function formatTime(seconds: number) {
    const hours = Math.floor(seconds / 3600).toString().padStart(2, '0');
    const minutes = Math.floor((seconds % 3600) / 60).toString().padStart(2, '0');
    const secs = (seconds % 60).toFixed(2).padStart(5, '0');
    return `${hours}:${minutes}:${secs}`;
  }
  
// Handle video processing with subtitle overlay
const handlePOST = async (req: NextApiRequest, res: NextApiResponse) => {
    const { subtitleStyle, videoClipPath } = req.body;
    try {
      // Generate .ass subtitle file content
      const transcriptionPath = path.join(process.cwd(), 'uploads', subtitleStyle.transcriptionPath);
      
      const transcriptionData = fs.readFileSync(transcriptionPath, 'utf-8');
      console.log(subtitleStyle)


      const assContent = createAssFile(transcriptionData, subtitleStyle);
  
      // Save the .ass subtitle file temporarily
    //   const assFilePath = path.join(process.cwd(),'public', `ass.ass`);

      const assFilePath = path.posix.join('public', `ass.ass`).replace(/\\/g, '/').replace(/^\/+/, '');


      fs.writeFileSync(assFilePath, assContent);
  
      // Process the video with ffmpeg and overlay the subtitles
    //   const videoInputPath = path.join(process.cwd(), 'uploads', videoClipPath)
      const videoInputPath = path.posix.join('uploads', videoClipPath).replace(/\\/g, '/').replace(/^\/+/, '');

      
      
    //   const outputVideoPath = path.join('public', 'resultVideo.mp4').replace(/\\/g, '/');
      const outputVideoPath = path.posix.join('public', 'resultVideo.mp4').replace(/\\/g, '/').replace(/^\/+/, '');

  
      
      exec(`ffmpeg -i ${videoInputPath} -vf "ass=${assFilePath}:fontsdir=public/fonts/" ${outputVideoPath}`, (error) => {
        if (error) {
            console.log(error);
            return res.status(500).json({ error: 'Failed to process video' });
        }
    
        // Set headers for video stream and download
        res.setHeader('Content-Type', 'video/mp4');
        res.setHeader('Content-Disposition', `attachment; filename=${"processed_video.mp4"}`);
        
    
        // Create a stream and pipe it to the response
        const fileStream = fs.createReadStream(outputVideoPath);
        fileStream.pipe(res);
        fileStream.on('error', (err) => {
            console.error('Error streaming the video:', err);
            res.status(500).json({ error: 'Failed to stream the video' });
        });
    
        // Optional: clean up files after streaming
        fileStream.on('end', () => {
            fs.unlinkSync(outputVideoPath); // Remove the output video after download
            fs.unlinkSync(assFilePath); // Remove the subtitle file after download
        });
    });
    
    



    
      
  
      
    } catch (error) {
      console.error('Error processing video with subtitles:', error);
      res.status(500).json({ error: 'Failed to generate video with subtitles' });
    }
  };