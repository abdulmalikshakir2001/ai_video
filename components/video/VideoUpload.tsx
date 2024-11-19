import { useTranslation } from 'next-i18next';
import { useState } from 'react';
// import Modal from '@/components/Modal';
// import { InputWithLabel } from '@/components/shared';
import * as Yup from 'yup';
import { useFormik } from 'formik';
// import { Button } from 'react-daisyui';
// import { FaPlus } from 'react-icons/fa';
import React from 'react';
import axios from 'axios';
import { useRouter } from 'next/router';
// import ReactPlayer from 'react-player';
import toast from 'react-hot-toast';
import { GiHamburgerMenu } from 'react-icons/gi';

import Drawer from '@/components/shared/shell/Drawer';
import { ImCross } from 'react-icons/im';

const VideoUpload: React.FC = () => {
  const router = useRouter();
  // const [loading, setLoading] = useState(false);
  const { t } = useTranslation('common');
  // const [isModalOpen, setIsModalOpen] = useState(false);
  // const [video, setVideo] = useState<any[]>([]);
  const [maxVideoLengthFromDB, setMaxVideoLengthFromDB] = useState<
    string | null
  >(null);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);

  // const handleOpenModal = () => {
  //   setIsModalOpen(true);
  // };

  // const handleCloseModal = () => {
  //   setIsModalOpen(false);
  // };

  // const handleConfirm = () => {
  //   setIsModalOpen(false);
  // };

  const handleFileUpload = async (file: File) => {
    setIsUploading(true);
    // setIsModalOpen(false);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('/api/video/UploadVideo', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round(
              (progressEvent.loaded * 100) / progressEvent.total
            );
            setUploadProgress(percentCompleted);
          }
        },
      });

      setIsUploading(false);

      if (response.data.status === 'file uploaded') {
        toast.success('File uploaded successfully');
      } else if (response.data.status === 'file exist') {
        toast.error('File already exist');
      } else if (response.data.status === 'url inserted') {
        const { id } = response.data.data;
        router.push(`/videos/${id}`);
        toast.success('File uploaded successfully');
      } else if (response.data.status === 'subscription limit end') {
        router.push(`/dashboard/manageSubscription`);
        toast.error('Please upgrade subscription plan');
      } else if (response.data.status === 'subscription required') {
        router.push(`/pricing`);
        toast.error('subscription required');
      } else {
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
      // setLoading(true);

      try {
        const response = await axios.post('/api/video/UploadLink', {
          origionalVideoLink: link,
        });

        // setLoading(false);

        if (
          response.data.status === 'false' &&
          response.data.data === 'payment'
        ) {
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
          formik.setFieldError(
            'link',
            `You cannot upload video greater than ${formatMaxVideoLength(maxVideoLengthFromDB || '00:00:00')}`
          );
          toast.error('Error uploading video');
        }
      } catch (error) {
        // setLoading(false);
        console.error('Error uploading video:', error);
        setMaxVideoLengthFromDB(null);
        toast.error('Error uploading video');
      }
    },
  });

  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && handleFileUpload) {
      handleFileUpload(file);
    }
  };

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const toggleDrawer = () => {
    setSidebarOpen((prev) => !prev); // Toggle sidebar visibility
  };

  // useEffect(() => {
  //   axios
  //     .get('/api/video/UploadVideo')
  //     .then((res) => {
  //       setVideo(res.data.data);
  //       setMaxVideoLengthFromDB(res.data.maxVideoLengthFromDB);
  //     })
  //     .catch((error) => {
  //       console.error('Error fetching video data:', error);
  //     });
  // }, []);

  return (
    <div>

{/* -left-7 */}
      <div className={ `parent_class relative   ${sidebarOpen ? '-left-7':'-left-full'}`}>
        <div
          className="absolute z-[51] -top-20 left-56 cursor-pointer"
          onClick={toggleDrawer}
          id="cross"
        >
          <ImCross />
        </div>
        <Drawer sidebarOpen={sidebarOpen} setSidebarOpen={setSidebarOpen} />
      </div>

      <div className="flex gap-x-20 mb-32">
        <div
          className="bg-cus_dark_gray text-white rounded-xl w-16  text-2xl flex justify-center items-center cursor-pointer"
          id="hamburger"
          onClick={toggleDrawer}
        >
          <GiHamburgerMenu />
        </div>
        <div className="bg-cus_dark_pink h-12 w-full rounded-xl flex justify-center items-center ">
          <p className="text-white font-semibold font-cus_monserrat text-2xl">
            {'Auto clips maker'}
          </p>
        </div>
      </div>

      {/* ======================================= */}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* <div
          // onClick={handleOpenModal}
          className="bg-purple-200 flex flex-col items-center py-20 justify-center rounded-lg cursor-pointer aspect-w-1 aspect-h-1"
        >
          <FaPlus className="text-purple-500 text-xl md:text-2xl lg:text-3xl" />
        </div> */}
        {/* {video &&
          video.map((clip, index) =>
            clip.originalLink ? (
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
          )} */}
      </div>

      {/* =============================================== */}
      <div className="flex flex-col">
        <div>
          <h2 className="text-center font-cus_monserrat text-3xl font-semibold mb-8">
            {'Upload Your files'}
          </h2>
        </div>

        <div className="flex">
          <div className="flex-1">
            <label htmlFor="file_upload" className="cursor-pointer">
              <div className="w-full h-80 bg-dark_purple flex flex-col justify-center items-center rounded-md">
                <div>
                  <svg
                    width="150"
                    height="107"
                    viewBox="0 0 193 156"
                    fill="none"
                    xmlns="http://www.w3.org/2000/svg"
                  >
                    <path
                      fill-rule="evenodd"
                      clip-rule="evenodd"
                      d="M102.944 125.633V149.036C102.944 152.882 99.8116 156 95.947 156C92.0825 156 88.9496 152.882 88.9496 149.036V125.633H36.1756C16.1964 125.633 0 109.514 0 89.631C0 72.5413 11.9649 58.2328 28.0128 54.5494C28.0037 54.2438 27.9991 53.937 27.9991 53.6291C27.9991 36.8153 41.6953 23.1849 58.5903 23.1849C61.6059 23.1849 64.5195 23.6192 67.2716 24.4282C76.8815 9.72361 93.5389 0 112.478 0C142.24 0 166.367 24.0106 166.367 53.6291C166.367 55.3139 166.288 56.9806 166.136 58.6257C181.192 62.1569 192.399 75.6145 192.399 91.6769C192.399 110.43 177.123 125.633 158.279 125.633H102.944ZM95.9059 56.7121C94.2657 56.7121 92.79 57.2831 91.1498 58.9154L63.4335 85.5191C62.2037 86.7433 61.5477 88.049 61.5477 89.8443C61.5477 93.19 64.0895 95.5567 67.5336 95.5567C69.0916 95.5567 70.8136 94.9038 71.9615 93.5981L84.3438 80.4595L89.92 74.6653L89.4277 86.8248V121.575C89.4277 125.002 92.3799 127.858 95.9059 127.858C99.4319 127.858 102.466 125.002 102.466 121.575V86.8248L101.892 74.6653L107.468 80.4595L119.932 93.5981C121.08 94.9038 122.802 95.5567 124.442 95.5567C127.886 95.5567 130.346 93.19 130.346 89.8443C130.346 88.049 129.608 86.7433 128.378 85.5191L100.662 58.9154C99.0219 57.2831 97.628 56.7121 95.9059 56.7121Z"
                      fill="#1179AD"
                    />
                  </svg>
                </div>
                <div>
                  {' '}
                  <p className="pt-4 font-cus_monserrat text-3xl font-semibold">
                    {' '}
                    {'Drag Files Here'}{' '}
                  </p>
                </div>
              </div>
              <input
                type="file"
                className="hidden"
                onChange={handleFileChange}
                id="file_upload"
              />
            </label>
          </div>
          <div className="flex flex-col place-content-center uppercase p-5">
            {' '}
            <p className="font-cus_monserrat font-semibold">{'or'}</p>
          </div>
          <div className="flex-1">
            <div className="w-full h-80 bg-dark_purple flex flex-col justify-center items-center rounded-md">
              <div className="flex gap-x-4">
                <svg
                  width="66"
                  height="45"
                  viewBox="0 0 66 45"
                  fill="none"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    d="M64.3021 7.25782C63.5471 4.53449 61.3403 2.38819 58.5237 1.65634C53.4277 0.333375 33.0002 0.333374 33.0002 0.333374C33.0002 0.333374 12.5726 0.333375 7.47661 1.65634C4.66727 2.38819 2.4532 4.52745 1.69824 7.25782C0.333495 12.1978 0.333496 22.5 0.333496 22.5C0.333496 22.5 0.333495 32.8023 1.69824 37.7423C2.44594 40.4656 4.66001 42.6119 7.47661 43.3437C12.5726 44.6667 33.0002 44.6667 33.0002 44.6667C33.0002 44.6667 53.4277 44.6667 58.5237 43.3437C61.333 42.6119 63.5471 40.4726 64.3021 37.7423C65.6668 32.8023 65.6668 22.5 65.6668 22.5C65.6668 22.5 65.6668 12.1978 64.3021 7.25782ZM26.4668 32V13L43.439 22.5L26.4668 32Z"
                    fill="#C00F29"
                  />
                </svg>
                <input
                  type="text"
                  placeholder="https://www.youtube.com"
                  className="input input-bordered w-full max-w-xs bg-cus_light_grey"
                />
              </div>
              <div>
                <p className="mt-10 font-cus_monserrat text-3xl font-semibold ">
                  {'paste a youtube video link'}
                </p>{' '}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* =============================================== */}

      {/* <Modal
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
      </Modal> */}

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
