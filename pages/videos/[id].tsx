
import Head from 'next/head';
import { NextPageWithLayout } from 'types';
import { useTranslation } from 'next-i18next';
import { GetServerSidePropsContext } from 'next';
import { serverSideTranslations } from 'next-i18next/serverSideTranslations';
import { useRouter } from 'next/router';
import { getVideoById } from 'models/uploadedVideo';
import React, {  useState } from 'react';
import ReactPlayer from 'react-player';
import axios from 'axios';
import {  Loading } from '@/components/shared';

import { Container, Grid, Typography, Box, Button, MenuItem, Select, InputLabel, FormControl, TextField, Slider, Switch, FormControlLabel } from '@mui/material';
import AddIcon from '@mui/icons-material/Add'; 
import LanguageIcon from '@mui/icons-material/Language';
import TimerIcon from '@mui/icons-material/Timer';
import Home from '@/components/SocketClient';


const durationOptions = [
  { value: '1min', label: '1 min' },
  { value: '2min', label: '2 min' },
  { value: '3min', label: '3 min' },
  { value: '5min', label: '5 min' },
];

const languageOptions = [
  { value: 'en', label: 'English' },
  { value: 'es', label: 'Spanish' },
  { value: 'fr', label: 'French' },
  { value: 'de', label: 'German' },
];


const FetchingVideo: NextPageWithLayout = ({
  originalLink,
  
}: any) => {
  const { t } = useTranslation('common');
  const router = useRouter();
  const { id } = router.query;
  const [loading,setLoading] = useState(false);

  const [timeFrameRange, setTimeFrameRange] = useState([1, 5]);
  const [duration, setDuration] = useState('1min');
  const [language, setLanguage] = useState('en');
  const [aiInstructions, setAiInstructions] = useState('');
  const [toggleStates, setToggleStates] = useState({
    magicFrame: false,
    // magicEmoji: false,
    magicMusic: false,
  });

  const handleSliderChange = (event, newValue) => {
    setTimeFrameRange(newValue);
  };

  const handleDurationChange = (event) => {
    setDuration(event.target.value);
  };

  const handleLanguageChange = (event) => {
    setLanguage(event.target.value);
  };

  const handleAiInstructionsChange = (event) => {
    setAiInstructions(event.target.value);
  };

  const handleToggleChange = (event) => {
    setToggleStates(prevState => ({
      ...prevState,
      [event.target.name]: event.target.checked
    }));
  };


  const handleCreateClips = async () => {
    setLoading(true)
    const instance = axios.create({
      timeout: 3600 * 1000,
    });
    instance.post('/api/videoClips/clips', {
      originalLink: originalLink,
      videoId: id,
      timeFrameRange: timeFrameRange,
      duration: duration,
      language: language,
      aiInstructions: aiInstructions,
      toggleStates: toggleStates
  })
  .then(response => {
    if(response.data.statusMessage === 'clips created'){
      router.push(`/videos/moments/${id}`)
    }
      console.log('Response:', response.data.status);
  })
  .catch(error => {
      console.error('Error:', error);
  });
 
  };

  if(loading){
    return <Loading />
  }

  
  
  return (
    <>
      <Head>
        <title>{`${t('create-clips')}`}</title>
      </Head>
      <Home id={id} />
      <Container maxWidth="md" sx={{ mt: 4, backgroundColor: 'white', display: 'flex', flexDirection: 'column' }}>
      <Typography variant="h4" gutterBottom >
        {t("create-short")}
      </Typography>
      
      <Grid container spacing={2}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6">{t("video-preview")}</Typography>
            <Box sx={{ mt: 2 }}>
            <ReactPlayer url={`/api/loadVideo/${originalLink}`} width="400px" height="250px" controls={true} />
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: 2,
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6">{t("moment-duration")}</Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel >{t("duration")}</InputLabel>
              <Select
                value={duration}
                onChange={handleDurationChange}
                // sx={{ color: 'white' }}
                label="Duration"
              >
                {durationOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>

            <Typography variant="subtitle1" sx={{ mt: 2 }}>
              {t("ai-instructions")} ({t("Optional")})
            </Typography>
            <TextField
              multiline
              rows={4}
              placeholder="Enter AI instructions here..."
              value={aiInstructions}
              onChange={handleAiInstructionsChange}
              sx={{ mt: 2, backgroundColor: 'white',  }}
              fullWidth
            />
          </Box>
        </Grid>
      </Grid>

      {/* New Grid Section */}
      <Grid container spacing={2} sx={{ mt: 4 }}>
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              p: 2,
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6">
              <TimerIcon sx={{ mr: 1 }} /> {t("process-time-frame")}
            </Typography>
            <Box sx={{ width: '100%', mt: 2 }}>
              <Slider
                value={timeFrameRange}
                onChange={handleSliderChange}
                aria-labelledby="time-frame-slider"
                step={1}
                marks
                min={1}
                max={10}
                valueLabelDisplay="auto"
                valueLabelFormat={(value) => `${value} min`}
                sx={{ mb: 2 }}
                getAriaValueText={(value) => `${value} min`}
              />
              <Typography
                variant="body1"
                sx={{
                  textShadow: '1px 1px 2px gray, 0 0 25px gray, 0 0 5px gray',
                }}
              >
                {t("duration")}: {timeFrameRange[0]} {t("min")} - {timeFrameRange[1]} {t("min")}
              </Typography>
            </Box>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={6}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'center',
              p: 2,
              borderRadius: 1,
              textAlign: 'center',
            }}
          >
            <Typography variant="h6">
              <LanguageIcon sx={{ mr: 1 }} /> {t("select-language")}
            </Typography>
            <FormControl fullWidth sx={{ mt: 2 }}>
              <InputLabel sx={{}}>{t("Language")}</InputLabel>
              <Select
                value={language}
                onChange={handleLanguageChange}
                // sx={{ color: 'white' }}
                label="Language"
              >
                {languageOptions.map(option => (
                  <MenuItem key={option.value} value={option.value}>
                    {option.label}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
          </Box>
        </Grid>
      </Grid>

      <Box sx={{ mt: 4, textAlign: 'center' }}>
        <Button
          variant="contained"
          color="primary"
          sx={{ width: '200px', fontSize: '16px', padding: '10px 20px' }} 
          startIcon={<AddIcon />}
          onClick={handleCreateClips}
        >
          {t("create-short")}
        </Button>
      </Box>

      <Box sx={{ mt: 4, textAlign: 'center', position: 'relative', mb: 4 }}>
  <Typography variant="h6" sx={{
    position: 'absolute',
    backgroundColor: 'white',
    padding: '0 10px',
    display: 'inline-block',
    top: '-0.0rem',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 1, 
  }}>
    {t("advanced")}
  </Typography>
  <Box sx={{ mt: 2, p: 2, border: '1px solid gray', borderRadius: 1, backgroundColor: 'white' }}>
    {Object.keys(toggleStates).map((key, index) => (
      <Box key={key} sx={{ mb: 2, display: 'flex', alignItems: 'center', justifyContent: 'space-between', borderRadius: 1, p: 2 }}>
        <Typography variant="body1">
        {(() => {
          switch (key) {
            case 'magicFrame':
              return 'Magic Frame';
            // case 'magicEmoji':
            //   return 'Magic Emoji';
            case 'magicMusic':
              return 'Magic Music';
            default:
              return `Toggle Option ${index + 1}`;
          }
        })()}
        </Typography>
        <FormControlLabel
          control={
            <Switch
              name={key}
              checked={toggleStates[key]}
              onChange={handleToggleChange}
              color="primary"
            />
          }
          label={toggleStates[key] ? 'On' : 'Off'}
          labelPlacement="end"
          sx={{ ml: 2 }}
        />
      </Box>
    ))}
  </Box>
</Box>

    </Container>
      
    </>
  );
};

export const getServerSideProps = async (
  context: GetServerSidePropsContext
) => {
  const { locale } = context;
  const { id }: any = context.params;

  const { originalLink, conVideoId }: any = await getVideoById(id);

  return {
    props: {
      ...(locale ? await serverSideTranslations(locale, ['common']) : {}),
      originalLink,
      conVideoId,
    },
  };
};

export default FetchingVideo;
