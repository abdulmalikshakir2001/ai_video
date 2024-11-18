import Head from 'next/head';
import { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import React, { useEffect, useState, useRef } from 'react';
import axios from 'axios';
import Link from 'next/link';
import { IoDownloadOutline, IoFilmOutline } from 'react-icons/io5';

const FetchingVideo: NextPageWithLayout = () => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [videoClips, setVideoClips] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>({});
  const [currentWord, setCurrentWord] = useState<{ [key: string]: string }>({});
  const [isProcessing, setIsProcessing] = useState<{ [key: string]: boolean }>({})
  const [subtitleStyle] = useState({
    fontSize: '20px',
    color: 'white',  // &H00FFFFFF
    currentWordBg: '#E4B1F000' , //'#E4B1F0' , 
    bottom: '54px',
    left: '50%',
    transform: 'translateX(-50%)',
    currentWordColor: '#00FF00' , //'white',  // &H00FFFFFF
    borderRadius:'10px',
    fontFamily:'Roboto',
    fontWeight:600,
    letterSpacing:'',
    textTransform:'uppercase',
    
    
  });
  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const transcriptionCache = useRef<{ [key: string]: any }>({});

  useEffect(() => {
    axios
      .post('/api/videoClips/getAllClips', {
        videoIdForClips: id,
      })
      .then((res) => {
        setVideoClips(res.data.data);
      });
  }, [id]);

  const fetchTranscription = async (clip: any) => {
    if (transcriptionCache.current[clip.id]) {
      return transcriptionCache.current[clip.id];
    }

    try {
      const res = await axios.get(`/api/loadVideo/${clip.tranSrc}`);
      transcriptionCache.current[clip.id] = res.data;
      const transcription = res.data;

      // Combine all text from the transcription file
      const combinedText = transcription.segments
        .map((segment: any) => segment.text)
        .join(' ');

      // Update the descriptions state
      setDescriptions((prevState) => ({
        ...prevState,
        [clip.id]: combinedText,
      }));

      
      return res.data;
    } catch (error) {
      console.error("Error fetching transcription:", error);
      return null;
    }
  };

  const checkWordTiming = (clip: any, video: HTMLVideoElement, transcription: any) => {
    const currentTime = video.currentTime;
  
    transcription.segments.forEach((segment: any) => {
      // Group words in threes
      const wordGroups: any[] = [];
      for (let i = 0; i < segment.words.length; i += 3) {
        const group = segment.words.slice(i, i + 3);
        const groupStart = group[0].start;
        const groupEnd = group[group.length - 1].end;
        wordGroups.push({ group, start: groupStart, end: groupEnd });
      }
      wordGroups.forEach((wordGroup: any) => {
        const { group, start, end } = wordGroup;
  
        if (currentTime >= start && currentTime <= end) {
          // Map through each word in the group and apply the dynamic styling
          const highlightedWords = group.map((wordObj: any, wordIndex: number) => {
            const isCurrentWord = currentTime >= wordObj.start && 
                                 (group[wordIndex + 1]?.start ? currentTime < group[wordIndex + 1].start : true);
            return `<span style="
                  background-color: ${isCurrentWord ? subtitleStyle.currentWordBg : 'transparent'};
                  color: ${isCurrentWord ? subtitleStyle.currentWordColor : subtitleStyle.color};
                  border-radius: ${isCurrentWord ? subtitleStyle.borderRadius : '0'};
                  display: inline-block;
                  transition: background-color 0.5s ease;
                ">${wordObj.word}</span>`;
          }).join(' ');
  
          setCurrentWord((prevState) => ({
            ...prevState,
            [clip.id]: highlightedWords,
          }));
        }
      });
    });
  };
  
  

  

  const handleVideoUpdate = (clip: any) => {
    if (!videoRefs.current[clip.id]) return;

    const video = videoRefs.current[clip.id];

    fetchTranscription(clip).then((transcription) => {
      if (!transcription) return;

      const update = () => {
        if (video) {
          checkWordTiming(clip, video, transcription);
          requestAnimationFrame(update);
        }
      };
      update(); // Start the loop
    });
  };


  const handleDownload = async (clip: any) => {
    try {
      // Set processing to true for this clip
      setIsProcessing((prevState) => ({
        ...prevState,
        [clip.id]: true,
      }));
  
      // Trigger the video download by calling the API
      const response = await axios.post(
        '/api/generateSubtitles/generateSubtitles',
        {
          subtitleStyle: {
            ...subtitleStyle,
            transcriptionPath: `${clip.tranSrc}`, // Include the transcription file path
          },
          videoClipPath: `${clip.clipSrc}`, // Path for the video clip
        },
        {
          responseType: 'blob', // Important: Set response type to blob to handle binary stream
        }
      );
  
      // Create a Blob URL for the video stream
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${'video'}.mp4`); // Name the downloaded file
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading the video:', error);
    } finally {
      // Set processing to false after request completes
      setIsProcessing((prevState) => ({
        ...prevState,
        [clip.id]: false,
      }));
    }
  };



  // ================
  useEffect(() => {
    // Fetch video clips when the page loads
    const fetchClips = async () => {
      try {
        const res = await axios.post('/api/videoClips/getAllClips', {
          videoIdForClips: id,
        });
        const clips = res.data.data;
        setVideoClips(clips);
  
        // Fetch descriptions for all clips
        fetchDescriptions(clips);
      } catch (error) {
        console.error('Error fetching video clips:', error);
      }
    };
  
    if (id) {
      fetchClips();
    }
  }, [id]);
  
  const fetchDescriptions = async (clips: any[]) => {
    try {
      const fetchPromises = clips.map(async (clip) => {
        if (clip.tranSrc) {
          const transcription = await fetchTranscription(clip); // Use existing fetchTranscription logic
          if (transcription) {
            const combinedText = transcription.segments
              .map((segment: any) => segment.text)
              .join(' ');
  
            setDescriptions((prevState) => ({
              ...prevState,
              [clip.id]: combinedText,
            }));
          }
        }
      });
  
      await Promise.all(fetchPromises);
    } catch (error) {
      console.error('Error fetching descriptions:', error);
    }
  };
  
  
  
  

  return (
    <>
      <Head>
        <title>{`${t('moments')}`}</title>
      </Head>
      <div className='mt-12 '>

      <div className='mb-10'>
  <div className='text-4xl font-cus_inter'>
    {"Clips"}
    <span className='text-2xl ml-1 align-super text-neutral-500'>{videoClips.length}</span>
  </div>
</div>

        

        <div className="flex flex-col gap-10  w-full ">
          
          {videoClips.map((clip, index) => (
            clip.clipSrc ? (
              <div key={index} style={{ marginBottom: '20px' }}>
                <div className='flex flex-col lg:flex-row gap-x-4'>

                <div className="flex items-center gap-8 flex-1">
                  <div
                    style={{
                      borderRadius: '10px',
                      border: '2px solid #000000',
                      overflow: 'hidden',
                      background: 'black',
                      
                    }}
                    className="relative"
                  >
                    <video
                      ref={(el) => {
                        videoRefs.current[clip.id] = el;
                      }}
                      src={`/api/loadVideo/${clip.clipSrc}`}
                      controls={true}
                      className="bg-black  object-cover"
                      onPlay={() => handleVideoUpdate(clip)}
                    />
                    {currentWord[clip.id] && (
                      <div
                        style={{
                          position: 'absolute',
                          fontSize: subtitleStyle.fontSize,
                          color: subtitleStyle.color,
                          bottom: subtitleStyle.bottom,
                          left: subtitleStyle.left,
                          transform: subtitleStyle.transform,
                          padding: '5px',
                          borderRadius: '5px',
                          textAlign: 'center',
                          width:'95%',
                          whiteSpace: 'pre-wrap',
                          fontFamily:subtitleStyle.fontFamily,
                          fontWeight:subtitleStyle.fontWeight,
                          letterSpacing:subtitleStyle.letterSpacing,
                          textTransform:subtitleStyle.textTransform as any,
                        }}
                        dangerouslySetInnerHTML={{ __html: currentWord[clip.id] }}
                      >
                        
                      </div>
                    )}
                  </div>

                  
                </div>

                <div className='flex-1 flex flex-col justify-between'>

                    <div>
                  {/* <p className='font-bold font-cus_inter'>{"Title For the Video"}</p> */}
                  <p className='mt-4 font-cus_inter text-neutral-500 trans_desc'>
                    {descriptions[clip.id] || 'Loading...'}
                  </p>
                  </div>

                  <div className="flex justify-end">
                    <div className="flex gap-3 mt-3">
                      <Link href={`/editor?moment=${clip.id}`} >
                      <button className=" flex justify-center items-center gap-2  px-4 py-2 rounded font-cus_inter">
                        <IoFilmOutline /> {t('Edit')}
                      </button>
                      </Link>
                      

                      <button
  className="flex justify-center items-center gap-2  px-4 py-2 rounded font-cus_inter"
  onClick={() => handleDownload(clip)}
  disabled={isProcessing[clip.id]} // Disable the button when processing
>
  {isProcessing[clip.id] ? 'Processing...' : <><IoDownloadOutline /> {"Download"}</>} {/* Conditionally show "Processing" */}
</button>





                    </div>
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
