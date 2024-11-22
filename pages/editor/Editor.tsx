'use client';

import { useRouter } from 'next/router';
import axios from 'axios';
import type { NextPageWithLayout } from 'types';
import { useCallback, useEffect, useRef, useState } from 'react';
import { IoMdSettings } from 'react-icons/io';
import SvgButton from '@/components/SvgButton';
// import { CirclePicker } from 'react-color';
import { SketchPicker } from 'react-color';
import { Button } from 'react-daisyui';

const Editor: NextPageWithLayout = () => {
  const router = useRouter();
  const [momentData, setMomentData] = useState<any>(null); // Use `any` for flexible typing
  const [videoClips, setVideoClips] = useState<any[]>([]);
  const [descriptions, setDescriptions] = useState<{ [key: string]: string }>(
    {}
  );
  const [currentWord, setCurrentWord] = useState<{ [key: string]: string }>({});
  const [horizontalPosition, setHorizontalPosition] =
    useState<string>('justify-center');
  const [verticalPosition, setVerticalPosition] = useState<string>('77%');

  const videoRefs = useRef<{ [key: string]: HTMLVideoElement | null }>({});
  const transcriptionCache = useRef<{ [key: string]: any }>({});
  // color picker
  const [selectedColor, setSelectedColor] = useState<string>('#00FF00');
  const [showPicker, setShowPicker] = useState(false);
  const pickerRef = useRef<HTMLDivElement>(null);
  // color picker
  // text color  picker
  const [selectedTextColor, setSelectedTextColor] = useState<string>('#FFFFFF');
  const [showTextPicker, setShowTextPicker] = useState(false);
  const pickerTextRef = useRef<HTMLDivElement>(null);
  // text color picker

  const [subtitleStyle] = useState({
    fontSize: '20px',
    color: selectedTextColor, // &H00FFFFFF
    currentWordBg: '#E4B1F000', //'#E4B1F0' ,

    left: 0,

    currentWordColor: selectedColor, //'white',  // &H00FFFFFF
    borderRadius: '10px',
    fontFamily: 'Roboto',
    fontWeight: 600,
    letterSpacing: '',
    textTransform: 'uppercase',
  });

  useEffect(() => {
    if (router.query.moment) {
      const momentId = router.query.moment as string;

      // Function to fetch the video clip data
      const fetchClipData = async (momentId: string) => {
        try {
          const response = await axios.post('/api/videoClips/getClip', {
            momentId,
          });
          const data = response.data;
          setMomentData(data.data); // Set the fetched data in state
          setVideoClips((prevClips) => {
            const isDuplicate = prevClips.some(
              (clip) => clip.id === data.data.id
            );
            if (!isDuplicate) {
              return [...prevClips, data.data];
            }
            return prevClips;
          });

          console.log('Moment data:', data);
        } catch (error) {
          console.error('Failed to fetch moment data:', error);
        }
      };

      fetchClipData(momentId); // Fetch data when the query parameter exists
    }
  }, [router.query.moment]);

  useEffect(() => {
    console.log(videoClips);
  }, [momentData, videoClips]);

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
      console.error('Error fetching transcription:', error);
      return null;
    }
  };

  const checkWordTiming = (
    clip: any,
    video: HTMLVideoElement,
    transcription: any
  ) => {
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
          const highlightedWords = group
            .map((wordObj: any, wordIndex: number) => {
              const isCurrentWord =
                currentTime >= wordObj.start &&
                (group[wordIndex + 1]?.start
                  ? currentTime < group[wordIndex + 1].start
                  : true);
              return `<span style="
                  background-color: ${isCurrentWord ? subtitleStyle.currentWordBg : 'transparent'};
                  color: ${isCurrentWord ? selectedColor : selectedTextColor};
                  border-radius: ${isCurrentWord ? subtitleStyle.borderRadius : '0'};
                  display: inline-block;
                  transition: background-color 0.5s ease;
                ">${wordObj.word}</span>`;
            })
            .join(' ');

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

  const fetchDescriptions = useCallback(async (clips: any[]) => {
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
  }, []);

  useEffect(() => {
    fetchDescriptions(videoClips);
  }, [videoClips, fetchDescriptions]);
  const [activeTab, setActiveTab] = useState('tab1');

  // them start
  const text = 'Customize the caption design ';
  const words = text.split(' '); // Split text into words
  const [activeWordIndex, setActiveWordIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);

  useEffect(() => {
    if (!isHovered) return; // Start animation only on hover

    const interval = setInterval(() => {
      setActiveWordIndex((prevIndex) =>
        prevIndex === words.length - 1 ? 0 : prevIndex + 1
      );
    }, 500); // Adjust animation speed

    return () => clearInterval(interval); // Cleanup when hover stops
  }, [isHovered, words.length]);

  const handleMouseEnter = () => {
    setIsHovered(true);
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
    setActiveWordIndex(0); // Reset to default state (first word green)
  };
  // theme end

  const svgButtClicked = (propertyName: string) => {
    setHorizontalPosition(propertyName);
  };

  const verticalPositionFn = (percentage: string) => {
    setVerticalPosition(percentage);
  };

  // color picker
  const handleBoxClick = () => {
    setShowPicker(!showPicker);
  };

  // Hide the color picker when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerRef.current &&
        !pickerRef.current.contains(event.target as Node)
      ) {
        setShowPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleColorChange = (color: any) => {
    setSelectedColor(color.hex);
  };

  // text color
  const handleTextBoxClick = () => {
    setShowTextPicker(!showTextPicker);
  };

  // Hide the color picker when clicking outside of it
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        pickerTextRef.current &&
        !pickerTextRef.current.contains(event.target as Node)
      ) {
        setShowTextPicker(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const handleTextColorChange = (color: any) => {
    setSelectedTextColor(color.hex);
  };
  // text color

  useEffect(() => {
    videoClips.length > 0 && handleVideoUpdate(videoClips[0]);
  }, [selectedColor, selectedTextColor]);

  // color picker

  return (
    <>
      <div className="flex">
        <div className="w-2/3">
          <div className='h-16 bg-cus_gray_shade border-2 border-neutral-200 border-e-0'></div>
          <div>
            {videoClips.map((clip, index) =>
              clip.clipSrc ? (
                <div key={index} style={{ marginBottom: '20px' }}>
                  <div className="flex flex-col">
                    <div className="">
                      <div
                        style={{
                          border: '2px solid #000000',
                          overflow: 'hidden',
                          background: 'black',
                        }}
                        className="relative flex"
                      >
                        <video
                          ref={(el) => {
                            videoRefs.current[clip.id] = el;
                          }}
                          src={`/api/loadVideo/${clip.clipSrc}`}
                          controls={true}
                          className="bg-black  object-cover flex-1 "
                          onPlay={() => handleVideoUpdate(clip)}
                        />

                        {currentWord[clip.id] && (
                          <div
                            style={{
                              position: 'absolute',
                              fontSize: subtitleStyle.fontSize,
                              color: subtitleStyle.color,
                              top: verticalPosition,
                              left: subtitleStyle.left,
                              width: '100%',
                              padding: '5px',
                              borderRadius: '5px',
                              textAlign: 'center',
                              whiteSpace: 'pre-wrap',
                              fontFamily: subtitleStyle.fontFamily,
                              fontWeight: subtitleStyle.fontWeight,
                              letterSpacing: subtitleStyle.letterSpacing,
                              textTransform: subtitleStyle.textTransform as any,
                            }}
                            className={`flex ${horizontalPosition}`}
                          >
                            {/* justify start,center,end for alignment */}
                            <div
                              className="flex gap-x-3 "
                              dangerouslySetInnerHTML={{
                                __html: currentWord[clip.id],
                              }}
                            />
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="description section">
                      <div className="p-8">
                        <h3 className="font-cus_inter font-semibold text-2xl">
                          {'Clip text'}
                        </h3>

                        <p className="mt-4 font-cus_inter text-neutral-500 trans_desc">
                          {descriptions[clip.id] || 'Loading...'}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              ) : null
            )}
          </div>
        </div>
        <div className="w-1/3 bg-cus_gray_shade flex flex-col justify-between">
          <div className="w-full max-w-md mx-auto ">
            {/* Tabs Header */}
            <div className="flex  h-16  justify-center items-center border-2 border-neutral-200">
              <div className="flex gap-x-4">
                <div
                  className={`flex justify-center items-center rounded  px-6 shadow ${
                    activeTab === 'tab1'
                      ? 'bg-white text-black'
                      : ' text-neutral-950'
                  }`}
                >
                  <div>
                    <IoMdSettings />
                  </div>
                  <div>
                    <button
                      className={`py-1 px-3  ${
                        activeTab === 'tab1'
                          ? 'bg-white text-black'
                          : ' text-neutral-950'
                      }`}
                      onClick={() => setActiveTab('tab1')}
                    >
                      {'Themes'}
                    </button>
                  </div>
                </div>

                <div
                  className={`flex justify-center items-center rounded px-6 shadow ${
                    activeTab === 'tab2'
                      ? 'bg-white text-black'
                      : ' text-neutral-950'
                  }`}
                >
                  <div>
                    <IoMdSettings />
                  </div>
                  <div>
                    <button
                      className={`py-1 px-3 rounded  ${
                        activeTab === 'tab2'
                          ? 'bg-white text-black'
                          : ' text-neutral-950'
                      }`}
                      onClick={() => setActiveTab('tab2')}
                    >
                      {'Settings'}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Tabs Content */}
            <div className="mt-4 h-full">
              {activeTab === 'tab1' && (
                <div className="ps-4  rounded ">
                  <p>
                    <div
                      className="flex justify-center items-center  bg-black h-14 rounded-md font-cus_inter italic font-bold p-4"
                      onMouseEnter={handleMouseEnter}
                      onMouseLeave={handleMouseLeave}
                    >
                      <div className="text-white text-2xl font-semibold">
                        {words.map((word, index) => (
                          <span
                            key={index}
                            className={`transition-colors duration-300 ${
                              index === activeWordIndex
                                ? 'text-green-500'
                                : 'text-white'
                            }`}
                          >
                            {word}
                            {index < words.length - 1 && ' '}{' '}
                            {/* Add spaces between words */}
                          </span>
                        ))}
                      </div>
                    </div>
                  </p>
                </div>
              )}
              {activeTab === 'tab2' && (
                <div className="p-4  rounded  ">
                  <div className=" space-y-2">
                    <div className="font-medium pb-0.5 text-sm font-cus_inter">
                      {'Colors'}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs  text-neutral-600 font-cus_inter">
                        {'Highlight color'}
                      </div>

                      <div className="flex gap-x-4 ps-4 bg-white pr-1 py-1 rounded-md border-2">
                        <div className="flex items-center gap-x-8">
                          <div className='font-cus_inter text-sm font-normal'>{selectedColor}</div>
                          <div
                            style={{
                              position: 'relative',
                              display: 'inline-block',
                            }}
                          >
                            {/* Color Box */}
                            <div
                              onClick={handleBoxClick}
                              style={{
                                backgroundColor: selectedColor,
                              }}
                              className="w-6 h-6 cursor-pointer border border-gray-300 rounded"
                            ></div>

                            {/* SketchPicker */}
                            {showPicker && (
                              <div
                                ref={pickerRef}
                                // style={{ position: 'absolute', zIndex: 100, marginTop: '10px' }}
                                className="absolute z-[100] mt-2 right-0 "
                              >
                                <SketchPicker
                                  color={selectedColor}
                                  onChange={handleColorChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="flex justify-between items-center">
                      <div className="text-xs  text-neutral-600 font-cus_inter">
                        {'Text color'}
                      </div>

                      <div className="flex gap-x-4 ps-4 bg-white pr-1 py-1 rounded-md border-2 ">
                        <div className="flex items-center gap-x-8">
                          <div>{selectedTextColor}</div>

                          <div
                            style={{
                              position: 'relative',
                              display: 'inline-block',
                            }}
                          >
                            {/* Color Box */}
                            <div
                              onClick={handleTextBoxClick}
                              style={{
                                backgroundColor: selectedTextColor,
                              }}
                              className="w-6 h-6 cursor-pointer border border-gray-300 rounded"
                            ></div>

                            {/* SketchPicker */}
                            {showTextPicker && (
                              <div
                                ref={pickerTextRef}
                                // style={{ position: 'absolute', zIndex: 100, marginTop: '10px' }}
                                className="absolute z-[100] mt-2 right-0 "
                              >
                                <SketchPicker
                                  color={selectedTextColor}
                                  onChange={handleTextColorChange}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>

                    <div className="font-medium pb-0.5 text-sm font-cus_inter">
                      {'Position'}
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs  text-neutral-600 font-cus_inter">
                        {'Text Position'}
                      </div>

                      <div className="flex gap-x-4">
                        <div className="">
                          <SvgButton
                            svgIcon={
                              <svg
                                viewBox="0 0 24 24"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path d="M8 11h3v10h2V11h3l-4-4-4 4zM4 3v2h16V3H4z"></path>
                              </svg>
                            }
                            onClick={() => {
                              verticalPositionFn('0%');
                            }}
                          />
                        </div>

                        <div>
                          <SvgButton
                            onClick={() => {
                              verticalPositionFn('40%');
                            }}
                            svgIcon={
                              <svg
                                viewBox="0 0 24 24"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path d="M8 19h3v4h2v-4h3l-4-4-4 4zm8-14h-3V1h-2v4H8l4 4 4-4zM4 11v2h16v-2H4z"></path>
                              </svg>
                            }
                          />
                        </div>

                        <div>
                          <SvgButton
                            onClick={() => {
                              verticalPositionFn('77%');
                            }}
                            svgIcon={
                              <svg
                                viewBox="0 0 24 24"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path d="M16 13h-3V3h-2v10H8l4 4 4-4zM4 19v2h16v-2H4z"></path>
                              </svg>
                            }
                          />
                        </div>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <div className="text-xs  text-neutral-600 font-cus_inter">
                        {'Alignment'}
                      </div>

                      <div className="flex gap-x-4">
                        <div className="">
                          <SvgButton
                            svgIcon={
                              <svg
                                viewBox="0 0 16 16"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M1.5 1a.5.5 0 0 1 .5.5v13a.5.5 0 0 1-1 0v-13a.5.5 0 0 1 .5-.5z"
                                ></path>
                                <path d="M3 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V7z"></path>
                              </svg>
                            }
                            onClick={() => {
                              svgButtClicked('justify-start');
                            }}
                          />
                        </div>

                        <div>
                          <SvgButton
                            onClick={() => {
                              svgButtClicked('justify-center');
                            }}
                            svgIcon={
                              <svg
                                viewBox="0 0 16 16"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path d="M8 1a.5.5 0 0 1 .5.5V6h-1V1.5A.5.5 0 0 1 8 1zm0 14a.5.5 0 0 1-.5-.5V10h1v4.5a.5.5 0 0 1-.5.5zM2 7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H3a1 1 0 0 1-1-1V7z"></path>
                              </svg>
                            }
                          />
                        </div>

                        <div>
                          <SvgButton
                            onClick={() => {
                              svgButtClicked('justify-end');
                            }}
                            svgIcon={
                              <svg
                                viewBox="0 0 16 16"
                                height="12"
                                width="12"
                                aria-hidden="true"
                                focusable="false"
                                fill="currentColor"
                                xmlns="http://www.w3.org/2000/svg"
                                className="StyledIconBase-sc-ea9ulj-0 ebjPRL text-neutral-500"
                              >
                                <path
                                  fill-rule="evenodd"
                                  d="M14.5 1a.5.5 0 0 0-.5.5v13a.5.5 0 0 0 1 0v-13a.5.5 0 0 0-.5-.5z"
                                ></path>
                                <path d="M13 7a1 1 0 0 0-1-1H2a1 1 0 0 0-1 1v2a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7z"></path>
                              </svg>
                            }
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
          <div>
            <Button className='bg-black w-full mx-3 text-sm text-white rounded-md font-cus_inter'>{"Export Video"}</Button>
          </div>
        </div>
      </div>
    </>
  );
};

export default Editor;
