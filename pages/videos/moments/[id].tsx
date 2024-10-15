import Head from 'next/head';
import { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useRef, useState } from 'react';
// import ReactPlayer from 'react-player';
import axios from 'axios';
import Link from 'next/link';
import { IoDownloadOutline, IoFilmOutline } from 'react-icons/io5';

interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}

const FetchingVideo: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [videoClips, setVidoClips] = useState<any[]>([
    // static data
    // {
    //   id: 1,
    //   title: "Clip 1",
    //   clipSrc: "/videos/video1.mp4",
    //   clipSubtitledSrc: "/videos/video1.mp4",
    //   srtSrc: "/subtitles/sub1.srt"
    // },
    // {
    //   id: 2,
    //   title: "Clip 1",
    //   clipSrc: "/videos/video2.mp4",
    //   clipSubtitledSrc: "/videos/video2.mp4",
    //   srtSrc: "/subtitles/sub2.srt"
    // },
    // {
    //   id: 3,
    //   title: "Clip 1",
    //   clipSrc: "/videos/video3.mp4",
    //   clipSubtitledSrc: "/videos/video3.mp4",
    //   srtSrc: "/subtitles/sub3.srt"
    // },
    // {
    //   id: 4,
    //   title: "Clip 1",
    //   clipSrc: "/videos/video4.mp4",
    //   clipSubtitledSrc: "/videos/video4.mp4",
    //   srtSrc: "/subtitles/sub4.srt"
    // },

  ]);

  const [subtitles, setSubtitles] = useState<Record<number, Subtitle[]>>({});
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<Record<number, number | null>>({});
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<Record<number, number | null>>({});
  // const [subtitlesContent, setSubtitlesContent] = useState<string>("");
  const videoRefs = useRef<(HTMLVideoElement | null)[]>([]);
  const [processingState, setProcessingState] = useState<Record<number, boolean>>({});
  const [config, setConfig] = useState({
    device: "cpu",
    // video_file: absoluteFilePath,
    audio_file: "audio.mp3", // audio file name
    // output_folder: dirPath,
    batch_size: 16,
    compute_type: "int8",
    srt_file: "srt.srt",
    ass_file: "ass.ass",
    output_video: "output.mp4",
    emoji: false, //toggleStates.magicEmoji
    emoji_position: { x: "(W-w)/2", y: "(H-h)/2" },
    min_words: 4,
    max_words: 8,
    // image_folder:path.join(process.cwd(), 'file_gallary'),
    image_size: 70,
    font: {
      fontname: "Montserrat",
      fontsize: 38,
      primary_color: "#FFFFFF",
      highlight_color: "#0000FF",
      outline_color: "&H00000000",
      back_color: "&H00000000",
      highlight_bg_color: "#1CFFDD",
      bold: -1,
      italic: 0,
      underline: 0,
      strike_out: 0,
      scale_x: 100,
      scale_y: 100,
      spacing: 0,
      angle: 5,
      border_style: 5,
      outline: 0,
      shadow: 1,
      alignment: 2,
      margin_l: 10,
      margin_r: 10,
      margin_v: 50,
      encoding: 0
    },
    // background_music: toggleStates.magicMusic,
    music_volume: 1.0,
    // music_file:path.join(process.cwd(), 'file_music'),
    // cropping: toggleStates.magicFrame,
    pyannote_auth_token: process.env.PYANNOTE_AUTH_TOKEN,
    aspect_ratio: [9, 16]
  })
   
  

  const textShadow =  `#1CFFDD 6px 0px 5px, 
      #1CFFDD 5px 1px 5px, 
      #1CFFDD 4px 3px 5px, 
      #1CFFDD 3px 5px 5px, 
      #1CFFDD 2px 6px 5px, 
      #1CFFDD 1px 7px 5px, 
      #1CFFDD 0px 7px 5px, 
      #1CFFDD -1px 7px 5px, 
      #1CFFDD -2px 6px 5px, 
      #1CFFDD -3px 4px 5px, 
      #1CFFDD -4px 3px 5px, 
      #1CFFDD -5px 1px 5px, 
      #1CFFDD -4px -1px 5px, 
      #1CFFDD -3px -3px 5px, 
      #1CFFDD -2px -5px 5px, 
      #1CFFDD -1px -6px 5px, 
      #1CFFDD 0px -7px 5px, 
      #1CFFDD 1px -6px 5px, 
      #1CFFDD 2px -4px 5px, 
      #1CFFDD 3px -3px 5px, 
      #1CFFDD 4px -1px 5px`
 

  useEffect(() => {
    const fetchSubtitles = async () => {
      const newSubtitles: Record<number, Subtitle[]> = {};

      for (const video of videoClips) {
        const response = await fetch(video.srtSrc);
        const text = await response.text();
        const parsedSubtitles = parseSRT(text);
        newSubtitles[video.id] = parsedSubtitles;
      }

      setSubtitles(newSubtitles);
    };

    fetchSubtitles();
  }, []);

  const parseSRT = (srt: string) => {
    const lines = srt.split('\n');
    const parsedSubtitles: Subtitle[] = [];
    let currentSubtitle: Subtitle | null = null;

    for (const line of lines) {
      const timeMatch = line.match(/(\d{2}):(\d{2}):(\d{2}),(\d{3}) --> (\d{2}):(\d{2}):(\d{2}),(\d{3})/);
      if (timeMatch) {
        if (currentSubtitle) parsedSubtitles.push(currentSubtitle);
        currentSubtitle = {
          startTime: Number(timeMatch[1]) * 3600 + Number(timeMatch[2]) * 60 + Number(timeMatch[3]) + Number(timeMatch[4]) / 1000,
          endTime: Number(timeMatch[5]) * 3600 + Number(timeMatch[6]) * 60 + Number(timeMatch[7]) + Number(timeMatch[8]) / 1000,
          text: ''
        };
      } else if (currentSubtitle) {
        if (!/^\d+$/.test(line.trim())) {
          currentSubtitle.text += line.trim() + ' ';
        }
      }
    }

    if (currentSubtitle) parsedSubtitles.push(currentSubtitle);
    return parsedSubtitles;
  };

  const handleTimeUpdate = (videoId: number) => {
    const video = videoRefs.current[videoId];
    if (!video || !subtitles[videoId]) return;

    const currentTime = video.currentTime;
    const foundIndex = subtitles[videoId].findIndex((subtitle, i) =>
      currentTime >= subtitle.startTime && (i + 1 >= subtitles[videoId].length || currentTime < subtitles[videoId][i + 1].startTime)
    );
    setCurrentSubtitleIndex((prev) => ({ ...prev, [videoId]: foundIndex !== -1 ? foundIndex : null }));

    if (foundIndex !== -1) {
      const subtitle = subtitles[videoId][foundIndex];
      const words = subtitle.text.split(" ");
      const wordDurations = words.map(() => (subtitle.endTime - subtitle.startTime) / words.length);
      const wordIndex = wordDurations.findIndex((_, i) =>
        currentTime >= subtitle.startTime + wordDurations.slice(0, i).reduce((a, b) => a + b, 0) &&
        currentTime < subtitle.startTime + wordDurations.slice(0, i + 1).reduce((a, b) => a + b, 0)
      );
      setHighlightedWordIndex((prev) => ({ ...prev, [videoId]: wordIndex !== -1 ? wordIndex : null }));
    } else {
      setHighlightedWordIndex((prev) => ({ ...prev, [videoId]: null }));
    }
  };

  const renderSubtitleText = (videoId: number) => {
    // Check if subtitle array for this video exists
    if (!subtitles[videoId] || currentSubtitleIndex[videoId] === null) return null;

    // Safeguard in case currentSubtitleIndex[videoId] is undefined
    const subtitleIndex = currentSubtitleIndex[videoId];
    if (subtitleIndex === undefined || !subtitles[videoId][subtitleIndex]) return null;

    // Now safely access the subtitle
    const subtitle = subtitles[videoId][subtitleIndex];
    const words = subtitle.text.split(" ");

    return (
      <p
        className="overflow-hidden select-none"
        style={{
          fontSize: "16px",
          fontFamily: config.font.fontname,
          color: config.font.primary_color,
          textAlign: "center",
          fontWeight: 600,
        }}
      >
        {words.map((word, index) => (
          <span key={index} style={{ color: index === highlightedWordIndex[videoId] ? config.font.highlight_color : config.font.primary_color, textShadow: index === highlightedWordIndex[videoId] ? textShadow : " ", fontSize: index === highlightedWordIndex[videoId] ? '20px' : '',
            transition: 'transform 0.3s ease',
            fontWeight: 600 }}>
            {word}{" "}
          </span>
        ))}
      </p>
    );
  };


  // api function ========
  const handleProcessVideo = async (clip: any) => {
    // Set the processing state only for the specific video
    setProcessingState((prev) => ({ ...prev, [clip.id]: true }));


    try {

      const responses = await fetch(clip.srtSrc);
      const text = await responses.text();

      const response = await fetch("/api/videoEditor/moment", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          videoUrl: clip.clipSrc,  // Pass the specific video URL from the clicked clip
          subtitlesUrl: clip.srtSrc,  // Pass the subtitles URL from the clicked clip
          subtitlesContent: text,  // Subtitles content for the specific video
          config
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);


        // Trigger automatic download
        const a = document.createElement('a');
        a.href = url;
        a.download = 'processed_video.mp4';
        a.click();
        // URL.revokeObjectURL(url);
      } else {
        console.error("Failed to process video");
      }
    } catch (error) {
      console.error("Error processing video:", error);
    } finally {
      // Reset the processing state for the specific video
      setProcessingState((prev) => ({ ...prev, [clip.id]: false }));
    }
  };


  useEffect(() => {
    axios
      .post('/api/videoClips/getAllClips', {
        videoIdForClips: id,

      })
      .then((res) => {
        console.log(res.data.data)
        // setVidoClips(res.data.data)

      });

  }, [id])

  const handleEditClick = (clipSrc: string) => {
    router.push({
      pathname: '/editor',
      query: { moment: clipSrc },  // Pass clipSrc as query parameter
    });
  };

  return (
    <>
      <Head>
        <title>{`${t('moments')}`}</title>
      </Head>
      <div>

        <Link href={`/dashboard`} passHref>
          <button

            className="bg-blue-500 text-white px-4 py-2 rounded"
          >
            {t('home')}
          </button>
        </Link>

        <div className="flex flex-col gap-10 mt-7 w-full max-w-4xl">
          {videoClips.map((clip, index) => (
            clip.clipSrc ? (
              <div key={index} style={{ marginBottom: '20px' }} >
                <div className='flex items-center gap-8 ml-52'>

                  <div style={{ borderRadius: '10px', border: '2px solid #000000', overflow: "hidden", background: "black", width: "280px", height: "500px" }}
                    className="relative">

                    <video
                      src={`${clip.clipSubtitledSrc}`}
                      controls={true}
                      className='bg-black w-[280px] h-[500px] object-cover'
                      ref={(el) => { videoRefs.current[clip.id] = el; }}
                      onTimeUpdate={() => handleTimeUpdate(clip.id)}
                    />

                    <div style={{
                      position: "absolute",
                      bottom: "20px",
                      right: '10px',
                      letterSpacing: `${config.font.spacing}px`,
                      transform: `translateX(10px) translateY(-30px) rotate(-${config.font.angle}deg) scale(1)`,
                      padding: '0.5rem 1rem',
                      textShadow: `2px 2px 0px rgba(0, 0, 0, 1),
                                  2px 2px -1px rgba(0, 0, 0, 1)`,
                      
                    }}
                      className="w-full flex items-center justify-center overflow-hidden"
                    >
                      {renderSubtitleText(clip.id)}
                    </div>

                  </div>

                  <div className=''>
                    <h3 className='text-center text-bold text-gray-500'>
                      <div className='flex justify-center items-center gap-2'> <span className='text-2xl uppercase font-bold text-gray-600 '>{t('title')}</span>  <span>{clip.title}</span> </div>
                    </h3>
                    <div className='flex gap-3 mt-3'>

                      <button onClick={() => handleEditClick(clip.id)} className='bg-blue-500 flex justify-center items-center gap-2 text-white px-4 py-2 rounded'> <IoFilmOutline /> {t("Edit")}</button>

                      <button
                        // href={`/api/loadVideo/${clip.clipSubtitledSrc}`}
                        onClick={() => handleProcessVideo(clip)}  // Pass the entire clip object
                        disabled={processingState[clip.id]}
                        className='border-2 flex justify-center items-center gap-2 shadow-lg px-4 py-2 rounded'
                      >
                        <IoDownloadOutline /> {processingState[clip.id] ? 'Processing...' : 'Download'}
                      </button>
                    </div>


                  </div>

                </div>
              </div>
            ) : null
          ))}
        </div>
      </div>
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;





  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),

    },
  };
};

export default FetchingVideo;
