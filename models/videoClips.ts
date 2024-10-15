import { prisma } from '@/lib/prisma'; // Import your Prisma instance

export const createVideoClip = async (data: any) => {
  try {
    
    const {  clipSrc,srtSrc,assSrc,tranSrc,audioSrc,clipSubtitledSrc,videoId ,config} = data;

    // Create a new video clip record in the VideoClips table
    const newClip = await prisma.videoClips.create({
      data: {
        clipSrc,
        srtSrc:srtSrc,
        assSrc:assSrc,
        tranSrc:tranSrc,
        audioSrc:audioSrc,
        clipSubtitledSrc:clipSubtitledSrc,
        config:config,
        videoId: +videoId,  // Ensuring videoId is cast to number
      },
    });

    return newClip;
  } catch (error) {
    console.error('Error creating video clip:', error);
    throw error;
  } finally {
    await prisma.$disconnect(); // Ensure Prisma client disconnects
  }
};


export const getAllClips = async (videoId: number) => {
  try {
    // Fetch all video clips where videoId matches the provided id
    const videoClips = await prisma.videoClips.findMany({
      where: {
        videoId: +videoId, // Find clips with this videoId
      },
    });

    return videoClips;
  } catch (error) {
    console.error('Error fetching video clips:', error);
    throw error;
  } finally {
    await prisma.$disconnect(); // Ensure Prisma client disconnects
  }
};