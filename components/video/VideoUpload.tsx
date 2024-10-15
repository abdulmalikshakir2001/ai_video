import { useTranslation } from 'next-i18next';
import { useEffect, useState } from 'react';
import Modal from '@/components/Modal';
import { InputWithLabel } from '@/components/shared';
import * as Yup from 'yup';
import { useFormik } from 'formik';
import { Button } from 'react-daisyui';
import { FaPlus } from 'react-icons/fa';
import React from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
import ReactPlayer from 'react-player';
import Link from 'next/link';
import toast from 'react-hot-toast';

const VideoUpload: React.FC = () => {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { t } = useTranslation('common');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [video, setVideo] = useState<any[]>([]);
  const [maxVideoLengthFromDB, setMaxVideoLengthFromDB] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  const handleConfirm = () => {
    setIsModalOpen(false);
  };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    setIsModalOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/video/UploadVideo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        },
      });

      setIsUploading(false);

      if (response.data.status === 'file uploaded') {
        toast.success('File uploaded successfully');
      } else if(response.data.status === 'file exist') {
        toast.error('File already exist');
      } else if (response.data.status === 'url inserted') {
        const { id } = response.data.data;
        router.push(`/videos/${id}`);
        toast.success('File uploaded successfully');
      }
      else if (response.data.status === 'subscription limit end') {
        router.push(`/dashboard/manageSubscription`);
        toast.error('Please upgrade subscription plan');
      }
       else {
        toast.error('Error uploading video');
      }
    } catch (error) {
      setIsUploading(false);
      console.error('Error uploading video:', error);
      toast.error('Something went wrong');
    }
  };

  const youtubeRegex = /^(https?:\/\/)?(www\.youtube\.com|youtu\.?be)\/.+$/;

  const formatMaxVideoLength = (length: string) => {
    const [hours, minutes] = length.split(':').map(Number);
    if (hours > 0) {
      return `${hours} ${hours === 1 ? 'hour' : 'hours'}`;
    }
    return `${minutes} ${minutes === 1 ? 'minute' : 'minutes'}`;
  };

  const formik = useFormik({
    initialValues: {
      link: '',
    },
    validationSchema: Yup.object().shape({
      link: Yup.string()
        .matches(youtubeRegex, 'Invalid YouTube link')
        .required('YouTube link is required'),
    }),
    onSubmit: async (values) => {
      const { link } = values;
      setLoading(true);

      try {
        const response = await axios.post('/api/video/UploadLink', {
          origionalVideoLink: link,
        });

        setLoading(false);

        if (response.data.status === 'false' && response.data.data === 'payment') {
          toast.error('You need to buy a subscription to upload videos.');
          router.push(`/pricing`);
          return;
        }

        if (response.data.status === 'true') {
          const { id, maxVideoLengthFromDB } = response.data.data;
          setMaxVideoLengthFromDB(maxVideoLengthFromDB);
          router.push(`/videos/${id}`);
          toast.success('Upload complete');
        } else {
          formik.setFieldError('link', `You cannot upload video greater than ${formatMaxVideoLength(maxVideoLengthFromDB || '00:00:00')}`);
          toast.error('Error uploading video');
        }
      } catch (error) {
        setLoading(false);
        console.error('Error uploading video:', error);
        setMaxVideoLengthFromDB(null);
        toast.error('Error uploading video');
      }
    },
  });

  useEffect(() => {
    axios.get('/api/video/UploadVideo').then((res) => {
      setVideo(res.data.data);
      setMaxVideoLengthFromDB(res.data.maxVideoLengthFromDB);
    }).catch(error => {
      console.error('Error fetching video data:', error);
    });
  }, []);


  return (
    <div>
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        <div
          onClick={handleOpenModal}
          className="bg-purple-200 flex flex-col items-center py-20 justify-center rounded-lg cursor-pointer aspect-w-1 aspect-h-1"
        >
          <FaPlus className="text-purple-500 text-xl md:text-2xl lg:text-3xl" />
        </div>
        {video && video.map((clip, index) =>
          clip.originalLink  ? (
            <div
              key={index}
              className="video_par flex flex-col w-full rounded-lg overflow-hidden aspect-w-1 aspect-h-1"
            >
              <Link href={`/videos/moments/${clip.id}`} passHref>
                <ReactPlayer
                  url={`/api/loadVideo/${clip.originalLink}`}
                  width="100%"
                  height="100%"
                  className="flex-1"
                />
              </Link>
              <div className="mt-3 px-2 text-xs font-bold text-center sm:text-sm">
                <p className="whitespace-normal">{clip.conVideoTitle}</p>
              </div>
            </div>
          ) : null
        )}
      </div>
      <Modal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        title={t('add-video')}
        onConfirm={handleConfirm}
        onFileUpload={handleFileUpload}
      >
        <form onSubmit={formik.handleSubmit}>
          <div className="flex items-center gap-x-3 flex-wrap">
            <div className="space-y-3 flex-1">
              <InputWithLabel
                type="text"
                label="Youtube Link"
                name="link"
                placeholder="Enter Youtube link"
                value={formik.values.link}
                error={formik.touched.link ? formik.errors.link : undefined}
                onChange={formik.handleChange}
              />
            </div>
            <div className="mt-9 space-y-3">
              <Button
                type="submit"
                color="primary"
                loading={loading}
                active={!loading}
                fullWidth
                size="md"
                className="text-white"
              >
                {t('import-statement')}
              </Button>
            </div>
          </div>
        </form>
      </Modal>

      {isUploading && (
        <div className="fixed bottom-4 right-4 bg-white shadow-lg rounded-lg p-4 w-64">
          <div className="text-center text-gray-700 font-semibold mb-2">
            {t('uploading-video')}: {uploadProgress}%
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2.5">
            <div
              className="bg-green-500 h-2.5 rounded-full"
              style={{ width: `${uploadProgress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default VideoUpload;
