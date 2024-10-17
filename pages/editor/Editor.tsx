"use client"
import { useEffect, useRef, useState } from "react";
import AspectRatio from "@/components/videoEditor/AspectRatio";
import VideoControls from "@/components/videoEditor/VideoControls";
import { FaRegEdit } from "react-icons/fa";
import { IoDocumentTextOutline } from "react-icons/io5";
import SubtitleEditor from "@/components/videoEditor/SubtitleEditor";
import Timeline from "@/components/videoEditor/TimeLine";
import { ImFolderDownload } from "react-icons/im";
import { useRouter } from "next/router";
import axios from "axios";
import type { NextPageWithLayout } from 'types';
import { useEditorContext } from "@/components/ContextApi/EditorContext";
interface Subtitle {
  startTime: number;
  endTime: number;
  text: string;
}
// font style setting
interface FontStyle {
  id: number;
  fontSize: string;
  color: string;
  highlightColor: string;
  fontFamily: string;
  borderRadius: string;
  padding: string;
  fontWeight: number;
  textShadow?: string; 
  backgroundColor: string;
  textAlign: "left" | "center" | "right"; 
  textTransform: "none" | "capitalize" | "uppercase" | "lowercase"; 
  letterSpacing: string;
  xPosition: string; 
  yPosition: string;
  rotation: string; 
  scale: string; 
}

 const Editor :NextPageWithLayout = ( ) => {
  const { values } = useEditorContext(); // Access context values
  useEffect(()=>{
    console.log(values)
  },[values])

  const [momentData, setMomentData] = useState<any>(null);
  const [subtitlesUrl, setSubtitlesUrl] = useState<string>(
    momentData && `/api/loadVideo/${momentData.srtSrc}`
  );
  useEffect(()=>{
    console.log(subtitlesUrl)

  },[subtitlesUrl])
  
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [subtitlesContent, setSubtitlesContent] = useState<string>("");
  const [subtitles, setSubtitles] = useState<Subtitle[]>([]);
  const [currentSubtitleIndex, setCurrentSubtitleIndex] = useState<
    number | null
  >(null);
  const [selectedRatio, setSelectedRatio] = useState<string>("9:16");
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [tempSubtitleText, setTempSubtitleText] = useState<string>("");
  const [showOnlyText, setShowOnlyText] = useState<boolean>(true);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const [fontStyle, setFontStyle] = useState<FontStyle>({
      id: 1,
      fontSize: "16px",
      color: "#FFFFFF",
      highlightColor: '#0000FF',
      fontFamily: "Montserrat",
      borderRadius: '0.375rem',
      padding: '0.5rem 0.5rem',
      fontWeight: 800,
      textAlign: 'center',
      textTransform: 'none',
      letterSpacing: '1.5',
      xPosition: "10", // Default position
      yPosition: "-30", // Default position
      rotation: "-5", // Default rotation
      scale: "1", // Default scale
      textShadow:
          `#1CFFDD 6px 0px 5px, 
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
          #1CFFDD 4px -1px 5px`,
      backgroundColor: " ",
  });
  const [startTime, setStartTime] = useState<number>(0);
  const [endTime, setEndTime] = useState<number>(0);
  const [highlightedWordIndex, setHighlightedWordIndex] = useState<number | null>(null);

  const router = useRouter();

  // useEffect(() => {
  //   if (router.query.src) {
  //     setVideoUrl(router.query.src as string); // Retrieve the `src` from the query
  //   }
  // }, [router.query.src]);
  useEffect(() => {
    if (router.query.moment) {
      const momentId = router.query.moment as string;

      // Send a POST request to get the video clip data by moment id
      const fetchClipData = async (momentId: string) => {
        try {
          const response = await axios.post("/api/videoClips/getClip", { momentId });
          const momentData = response.data;
          setMomentData(momentData.data);
          
        } catch (error) {
          console.error("Failed to fetch moment data:", error);
        }
      };
      fetchClipData(momentId); // Call the function when the moment query param is present
    }
  }, [router.query.moment]);
  useEffect(()=>{
    setSubtitlesUrl(momentData && `/api/loadVideo/${momentData.srtSrc}`)
  },[momentData,subtitlesUrl])
  const handleCutVideo = (start: number, end: number) => {
    setStartTime(start);
    setEndTime(end);
  };
  const handleFontStyleChange = (newFontStyle: FontStyle) => {
    setFontStyle(newFontStyle);
  };
  useEffect(() => {
    const fetchAndParseSubtitles = async () => {
      try {
        const response = await fetch(subtitlesUrl);
        if (!response.ok) throw new Error("Failed to fetch subtitles");
        const text = await response.text();
        setSubtitlesContent(text);
        parseSrt(text);
      } catch (error) {
        console.error("Failed to fetch and parse subtitles:", error);
      }
    };
    fetchAndParseSubtitles();
  }, [subtitlesUrl ]);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const foundIndex = subtitles.findIndex(
        (subtitle, i) =>
          currentTime >= subtitle.startTime &&
          (i + 1 >= subtitles.length ||
            currentTime < subtitles[i + 1].startTime)
      );
      setCurrentSubtitleIndex(foundIndex !== -1 ? foundIndex : null);
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [subtitles]);

  const parseSrt = (srtContent: string) => {
    const subtitleEntries = srtContent.trim().split("\n\n");
    const parsedSubtitles = subtitleEntries
      .map((entry) => {
        const lines = entry.split("\n");
        if (lines.length < 3) return null;

        const [startTime, endTime] = lines[1].split(" --> ").map(parseTime);
        const text = lines.slice(2).join(" ");
        return { startTime, endTime, text };
      })
      .filter(Boolean) as Subtitle[];

    setSubtitles(parsedSubtitles);
  };

  const parseTime = (timeString: string): number => {
    const [hours, minutes, seconds] = timeString
      .split(":")
      .map((part, index) =>
        index === 2 ? parseFloat(part.replace(",", ".")) : parseFloat(part)
      );
    return hours * 3600 + minutes * 60 + seconds;
  };

  const formatTime = (time: number): string => {
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);
    const milliseconds = Math.round((time % 1) * 1000);
    return `${String(hours).padStart(2, "0")}:${String(minutes).padStart(
      2,
      "0"
    )}:${String(seconds).padStart(2, "0")},${String(milliseconds).padStart(
      3,
      "0"
    )}`;
  };

  // Function to format time as minutes and seconds for display
  const formatDisplayTime = (time: number): string => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${String(seconds).padStart(2, "0")}`;
  };

  const handleRatioChange = (ratio: string) => {
    setSelectedRatio(ratio);
  };

  const getAspectRatioStyle = () => {
    switch (selectedRatio) {
      case "9:16":
        return "w-[220px] h-[400px] bg-black object-cover";
      case "1:1":
        return "w-[300px] h-[300px] bg-black object-cover";
      default:
        return "w-[400px] h-[220px] bg-black";
    }
  };

  // api function ========
  const handleProcessVideo = async () => {
    setIsProcessing(true);
    

    try {
      const response = await fetch("/api/videoEditor/processVideo", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
           videoUrl :`${momentData.clipSrc}`,
          subtitlesUrl:`${momentData.srtSrc}`,
          subtitlesContent,
          selectedRatio,
          fontStyle,
          startTime,
          endTime
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
      setIsProcessing(false);
    }
  };

  // subtitles text edit
  const handleSubtitleClick = (index: number) => {
    setEditingIndex(index);
    setTempSubtitleText(subtitles[index].text);
  };

  const handleSubtitleChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setTempSubtitleText(event.target.value);
  };

  const handleSaveSubtitle = () => {
    if (editingIndex !== null) {
      const updatedSubtitles = [...subtitles];
      updatedSubtitles[editingIndex] = {
        ...updatedSubtitles[editingIndex],
        text: tempSubtitleText,
      };
      setSubtitles(updatedSubtitles);
      setSubtitlesContent(
        updatedSubtitles
          .map(
            (sub, index) =>
              `${index + 1}\n${formatTime(sub.startTime)} --> ${formatTime(
                sub.endTime
              )}\n${sub.text}`
          )
          .join("\n\n")
      );
      setEditingIndex(null);
    }
  };

  const toggleView = (onlyText: boolean) => {
    setShowOnlyText(onlyText);
  };

  // subtitles spoken word highlighting
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;
    const handleTimeUpdate = () => {
      const currentTime = video.currentTime;
      const foundIndex = subtitles.findIndex(
        (subtitle, i) =>
          currentTime >= subtitle.startTime &&
          (i + 1 >= subtitles.length || currentTime < subtitles[i + 1].startTime)
      );
      setCurrentSubtitleIndex(foundIndex !== -1 ? foundIndex : null);

      if (foundIndex !== -1) {
        const subtitle = subtitles[foundIndex];
        const words = subtitle.text.split(" ");
        let cumulativeTime = subtitle.startTime;
        const wordDurations = words.map(() => {
          const duration = (subtitle.endTime - subtitle.startTime) / words.length;
          cumulativeTime += duration;
          return cumulativeTime;
        });

        const wordIndex = wordDurations.findIndex(
          (endTime, i) =>
            currentTime >= (i === 0 ? subtitle.startTime : wordDurations[i - 1]) &&
            currentTime < endTime
        );
        setHighlightedWordIndex(wordIndex !== -1 ? wordIndex : null);
      } else {
        setHighlightedWordIndex(null);
      }
    };

    video.addEventListener("timeupdate", handleTimeUpdate);
    return () => video.removeEventListener("timeupdate", handleTimeUpdate);
  }, [subtitles]);

  const renderSubtitleText = () => {
    if (currentSubtitleIndex === null) return null;

    const subtitle = subtitles[currentSubtitleIndex];
    const words = subtitle.text.split(" ");

    let textShadow;
    if(fontStyle.id === 1 || fontStyle.id === 2){
      textShadow = ' '
    } else {
      textShadow = fontStyle.textShadow
    }

    const getTextStyles = (index: number) => {
      if (fontStyle.id === 1 || fontStyle.id === 2) {
        return {
          color: index === highlightedWordIndex ? fontStyle.highlightColor : fontStyle.color,
          textShadow: index === highlightedWordIndex ? fontStyle.textShadow : " ", // Apply textShadow if available
          // scale(1.1)
          fontSize: index === highlightedWordIndex ? '24px' : ' ',
        };
      } else {
        return {
          color: index === highlightedWordIndex ? fontStyle.highlightColor : fontStyle.color,
          fontSize: index === highlightedWordIndex ? '24px' : '',
          transition: 'transform 0.3s ease',
          // textShadow: "none", // No textShadow for other fonts
        };
      }
    }
    
    return (
      <p 
      className="select-none overflow-hidden"
                  style={{ 
                    fontSize: `${fontStyle.fontSize}`, 
                    fontFamily: `${fontStyle.fontFamily}`, 
                    color: `${fontStyle.color} || text-white`,  
                    fontWeight: `${fontStyle.fontWeight}`, 
                    letterSpacing: `${fontStyle.letterSpacing}`, 
                    textAlign: `${fontStyle.textAlign}`, 
                    textTransform: `${fontStyle.textTransform}`, 
                    textShadow: `${textShadow}`,
                    padding: `${fontStyle.padding}`,
                   }}
      >
        {words.map((word, index) => (
          <span
            key={index}
            style={getTextStyles(index)}
          >
            {word}{" "}
          </span>
        ))}
      </p>
    );
  };


  return (
    <>
      <div className="flex justify-between items-center shadow-md gap-5 border-b-2 bg-neutral-100  w-full px-4">
        <h1 className="w-full text-lg font-bold p-4">
          {"Video Title"}
        </h1>
        <AspectRatio
          onRatioChange={handleRatioChange}
          selectedRatio={selectedRatio}
        />
        <button
          onClick={handleProcessVideo}
          disabled={isProcessing}
          className="flex items-center justify-center gap-3 bg-blue-500 hover:bg-blue-600 text-neutral-50 rounded-lg px-3 py-2 shadow-lg"
        >
          <ImFolderDownload />
          {isProcessing ? "Processing..." : "Export"}
        </button>
      </div>

      <div className="flex items-center justify-between w-full gap-8">
        <div className="w-[400px] h-[400px] overflow-y-auto border-2">
          <div className="flex gap-4 border-b-2">
            <button
              onClick={() => toggleView(true)}
              className={`px-4 py-2 text-lg ${showOnlyText
                ? "border-b-2 border-gray-900 text-black"
                : "border-none text-gray-700"
                } `}
            >
              <IoDocumentTextOutline />
            </button>
            <button
              onClick={() => toggleView(false)}
              className={`px-4 py-2 text-lg flex gap-2 items-center ${!showOnlyText
                ? "border-b-2 border-gray-900 text-black"
                : "border-none text-gray-700"
                } `}
            >
              <FaRegEdit /> {"Edit"}
            </button>
          </div>

          {/* Show either only subtitles or full view based on toggle */}
          {showOnlyText ? (
            <p className="px-2 py-1">
              {subtitles.map((subtitle) => subtitle.text).join(" ")}
            </p>
          ) : (
            subtitles.map((subtitle, index) => (
              <div key={index} className="flex mt-1 gap-2 items-center">
                <p className="text-sm text-gray-500">
                  {formatDisplayTime(subtitle.startTime)}
                </p>
                {editingIndex === index ? (
                  <input
                    type="text"
                    value={tempSubtitleText}
                    onChange={handleSubtitleChange}
                    onBlur={handleSaveSubtitle}
                    className="w-full px-2 py-1 border outline-none focus:outline-none border-gray-300 rounded-lg"
                  />
                ) : (
                  <p
                    onClick={() => handleSubtitleClick(index)}
                    className={`cursor-pointer w-full px-2 py-1 ${currentSubtitleIndex === index ? "text-blue-500" : ""
                      } border border-white rounded-lg hover:border-gray-500`}
                  >
                    {subtitle.text}
                  </p>
                )}
              </div>
            ))
          )}
        </div>
      {/* video preview tag with subtitles  */}
        <div className="w-[400px] h-[400px] flex items-center justify-center mb-5 mt-5 relative">
          <div className={`${getAspectRatioStyle()} relative overflow-hidden`}>
            <video
              src={momentData &&  `/api/loadVideo/${momentData.clipSrc}`}
              ref={videoRef}
              className={`${getAspectRatioStyle()}`}
            />
            
            {currentSubtitleIndex !== null && (
              <div
                style={{
                  position: "absolute",
                  bottom: "0px",
                  right: '10px',
                  letterSpacing: `${fontStyle.letterSpacing}px`,
                  transform: `translateX(${fontStyle.xPosition}px) translateY(${fontStyle.yPosition}px) rotate(${fontStyle.rotation}deg) scale(${fontStyle.scale})`,
                }}
                className="w-full flex items-center justify-center overflow-hidden"
              >
                {/* subtitles text */}
                {currentSubtitleIndex !== null && renderSubtitleText()}
              </div>
            )}
          </div>
        </div>

        <SubtitleEditor fontStyle={fontStyle} onFontStyleChange={handleFontStyleChange} />

      </div>

      <div className="w-full">
        <VideoControls videoRef={videoRef} />
      </div>
      <div className="w-full">
        <Timeline 
        videoUrl={momentData && `/api/loadVideo/${momentData.clipSrc}`} 
        videoRef={videoRef} 
        onCutVideo={handleCutVideo} 
        subtitles={subtitles}
          />
      </div>
      <div>
      {isProcessing && <p>{"Processing your video, please wait..."}</p>}
      
      </div>
    </>
  );
}





export default Editor;

