'use client';

import { useState } from 'react';
import { Download, Instagram, Video, Shield, Zap, Play } from 'lucide-react';
import { motion } from 'framer-motion';
import { Toaster, toast } from 'react-hot-toast';

interface DownloadResult {
  type: 'video' | 'photo' | 'reel' | 'story' | 'igtv';
  url: string;
  thumbnail?: string;
  title?: string;
  duration?: string;
  size?: string;
}

export default function Home() {
  const [url, setUrl] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<DownloadResult[]>([]);
  // Remove the tabs state and UI
  // Auto-detect content type from URL
  const detectContentType = (url: string): 'video' | 'photo' | 'reel' | 'story' | 'igtv' | null => {
    if (url.includes('/reel/')) return 'reel';
    if (url.includes('/tv/')) return 'igtv';
    if (url.includes('/stories/')) return 'story';
    if (url.includes('/p/')) return null; // Could be photo or video, let backend decide
    return null;
  };

  const handleDownload = async () => {
    if (!url.trim()) {
      toast.error('Please enter an Instagram URL');
      return;
    }

    if (!url.includes('instagram.com')) {
      toast.error('Please enter a valid Instagram URL');
      return;
    }

    setLoading(true);
    try {
      // Don't send contentType - let backend auto-detect
      const response = await fetch('/api/download', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: url.trim() }), // Remove contentType
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to download content');
      }

      if (data.results.length === 0) {
        toast.error(`No content found for this URL. Please check the URL and try again.`);
      } else {
        setResults(data.results || []);
        toast.success('Content loaded successfully!');
      }
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const downloadFile = async (downloadUrl: string, filename: string) => {
    try {
      // Handle base64 data URLs (data:image/... or data:video/...)
      if (downloadUrl.startsWith('data:')) {
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = filename;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        toast.success('Download started!');
        return;
      }

      // Blob URLs from different contexts cannot be accessed - show error
      if (downloadUrl.startsWith('blob:')) {
        toast.error('Cannot download blob URL. Please try again or use a different Instagram URL.');
        return;
      }

      // For regular URLs, use the proxy endpoint
      const response = await fetch(`/api/proxy-download?url=${encodeURIComponent(downloadUrl)}`);
      
      if (!response.ok) {
        throw new Error('Download failed');
      }
      
      const blob = await response.blob();
      
      const link = document.createElement('a');
      link.href = URL.createObjectURL(blob);
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up the blob URL
      URL.revokeObjectURL(link.href);
      
      toast.success('Download started!');
    } catch (error) {
      console.error('Download error:', error);
      toast.error('Download failed');
    }
  };


  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-pink-50 to-indigo-50 dark:from-gray-900 dark:via-purple-900 dark:to-indigo-900">
      <Toaster position="top-right" />
      
      {/* Header */}
      <header className="bg-white/80 dark:bg-gray-900/80 backdrop-blur-md border-b border-gray-200 dark:border-gray-700 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <h1 className="text-2xl font-bold bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
                SaveClip
              </h1>
            </div>
            <nav className="hidden md:flex space-x-8">
              <a href="#features" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Features
              </a>
              <a href="#how-it-works" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                How it Works
              </a>
              <a href="#pricing" className="text-gray-600 dark:text-gray-300 hover:text-purple-600 dark:hover:text-purple-400 transition-colors">
                Pricing
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white mb-6">
            Download Instagram Content
            <span className="block bg-gradient-to-r from-purple-600 to-pink-600 bg-clip-text text-transparent">
              Instantly & Securely
            </span>
          </h2>
          <p className="text-xl text-gray-600 dark:text-gray-300 mb-8 max-w-3xl mx-auto">
            Download Instagram videos, photos, reels, stories, and IGTV content in high quality. 
            Fast, secure, and completely free to use.
          </p>
        </motion.div>

        {/* Download Interface */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="bg-white dark:bg-gray-800 rounded-2xl shadow-xl p-8 mb-12"
        >
          {/* URL Input */}
          <div className="space-y-4">
            <div className="relative">
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="Paste Instagram URL here..."
                className="w-full px-4 py-4 pr-12 border border-gray-300 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-purple-500 focus:border-transparent dark:bg-gray-700 dark:text-white text-lg"
              />
              <Instagram className="absolute right-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-400" />
            </div>
            
            <button
              onClick={handleDownload}
              disabled={loading}
              className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-4 px-6 rounded-xl font-semibold text-lg hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center space-x-2"
            >
              {loading ? (
                <>
                  <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span>Retrieving data, please wait a few seconds!</span>
                </>
              ) : (
                <>
                  <Download className="w-5 h-5" />
                  <span>Download</span>
                </>
              )}
            </button>
          </div>

          {/* Results - Show both photos and videos like SaveClip.app */}
          {results.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              transition={{ duration: 0.3 }}
              className="mt-8 space-y-6"
            >
              {(() => {
                const photos = results.filter(r => r.type === 'photo');
                const videos = results.filter(r => ['video', 'reel', 'igtv'].includes(r.type));
                
                return (
                  <>
                    {/* Show Photos in Card Format */}
                    {photos.length > 0 && (
                      <div>
                        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
                          Instagram Photo Download
                        </h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                          {photos.map((result, index) => (
                            <motion.div
                              key={index}
                              initial={{ opacity: 0, scale: 0.9 }}
                              animate={{ opacity: 1, scale: 1 }}
                              transition={{ duration: 0.3, delay: index * 0.1 }}
                              className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden hover:shadow-xl transition-shadow duration-300"
                            >
                              {/* Photo Thumbnail */}
                              <div className="relative aspect-square bg-gray-200 dark:bg-gray-700 overflow-hidden">
                                {result.thumbnail ? (
                                  <img
                                    src={result.thumbnail}
                                    alt="Photo"
                                    className="w-full h-full object-cover"
                                  />
                                ) : (
                                  <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-purple-400 to-pink-400">
                                    <Instagram className="w-16 h-16 text-white opacity-50" />
                                  </div>
                                )}
                                {/* Photo Badge */}
                                <div className="absolute top-2 left-2 bg-black bg-opacity-70 text-white px-2 py-1 rounded-md text-xs font-medium">
                                  Photo
                                </div>
                              </div>
                              
                              {/* Card Content */}
                              <div className="p-4">
                                <div className="mb-3">
                                  <p className="font-semibold text-gray-900 dark:text-white text-sm mb-1">
                                    Instagram Photo
                                  </p>
                                  {result.size && (
                                    <p className="text-xs text-gray-600 dark:text-gray-400">
                                      💾 {result.size}
                                    </p>
                                  )}
                                </div>
                                
                                {/* Download Button */}
                                <button
                                  onClick={() => downloadFile(result.url, `instagram-photo-${Date.now()}.jpg`)}
                                  className="w-full bg-gradient-to-r from-purple-600 to-pink-600 text-white py-2.5 px-4 rounded-lg hover:from-purple-700 hover:to-pink-700 transition-all font-medium text-sm flex items-center justify-center space-x-2"
                                >
                                  <Download className="w-4 h-4" />
                                  <span>Download Photo</span>
                                </button>
                              </div>
                            </motion.div>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Show Videos in Card Format - Matching the reference design */}
                    {videos.length > 0 && (
                      <div className="max-w-2xl mx-auto">
                        {videos.map((result, index) => (
                          <motion.div
                            key={index}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.3, delay: index * 0.1 }}
                            className="bg-white dark:bg-gray-900 rounded-lg overflow-hidden shadow-2xl"
                          >
                            {/* Dark Header Bar with Title and Video Icon */}
                            <div className="bg-black dark:bg-gray-950 px-4 py-3 flex items-center justify-between">
                              <h3 className="text-white font-semibold text-lg flex-1">
                                {result.title || `${result.type.charAt(0).toUpperCase() + result.type.slice(1)} Video`}
                              </h3>
                              <Video className="w-6 h-6 text-white" />
                            </div>
                            
                            {/* Video Thumbnail */}
                            <div className="relative w-full bg-gray-900 dark:bg-black overflow-hidden">
                              {result.thumbnail ? (
                                <img
                                  src={result.thumbnail}
                                  alt="Video thumbnail"
                                  className="w-full h-auto object-contain"
                                />
                              ) : (
                                <div className="w-full aspect-video flex items-center justify-center bg-gray-900">
                                  <Video className="w-20 h-20 text-gray-600" />
                                </div>
                              )}
                            </div>
                            
                            {/* Download Buttons - Two Blue Buttons Stacked */}
                            <div className="p-4 space-y-3 bg-white dark:bg-gray-900">
                              {/* Download Thumbnail Button */}
                              {result.thumbnail && (
                                <button
                                  onClick={() => downloadFile(result.thumbnail!, `instagram-thumbnail-${Date.now()}.jpg`)}
                                  className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                                >
                                  <Download className="w-5 h-5" />
                                  <span>Download Thumbnail</span>
                                </button>
                              )}
                              
                              {/* Download Video Button */}
                              <button
                                onClick={() => downloadFile(result.url, `instagram-${result.type}-${Date.now()}.mp4`)}
                                className="w-full bg-blue-600 hover:bg-blue-700 text-white py-3 px-4 rounded-lg font-medium flex items-center justify-center space-x-2 transition-colors"
                              >
                                <Download className="w-5 h-5" />
                                <span>Download Video</span>
                              </button>
                            </div>
                          </motion.div>
                        ))}
                      </div>
                    )}
                  </>
                );
              })()}
            </motion.div>
          )}
        </motion.div>

        {/* Features Section */}
        <section id="features" className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            Why Choose SaveClip?
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6 }}
              className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Zap className="w-8 h-8 text-purple-600 dark:text-purple-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">Lightning Fast</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Download Instagram content in seconds with our optimized extraction engine.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-green-100 dark:bg-green-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Shield className="w-8 h-8 text-green-600 dark:text-green-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">100% Secure</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Your privacy is protected. We dont store your data or Instagram credentials.
              </p>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="text-center p-6 bg-white dark:bg-gray-800 rounded-xl shadow-lg"
            >
              <div className="w-16 h-16 bg-blue-100 dark:bg-blue-900 rounded-full flex items-center justify-center mx-auto mb-4">
                <Video className="w-8 h-8 text-blue-600 dark:text-blue-400" />
              </div>
              <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">High Quality</h4>
              <p className="text-gray-600 dark:text-gray-300">
                Download content in original quality without any compression or watermarks.
              </p>
            </motion.div>
          </div>
        </section>

        {/* How It Works */}
        <section id="how-it-works" className="mb-16">
          <h3 className="text-3xl font-bold text-center text-gray-900 dark:text-white mb-12">
            How It Works
          </h3>
          <div className="grid md:grid-cols-3 gap-8">
            {[
              {
                step: "1",
                title: "Copy Instagram Link",
                description: "Find the Instagram post, story, or reel you want to download and copy its link."
              },
              {
                step: "2", 
                title: "Paste & Download",
                description: "Paste the Instagram URL into our downloader and click the download button."
              },
              {
                step: "3",
                title: "Save Content",
                description: "Choose your preferred quality and save the content to your device instantly."
              }
            ].map((item, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 20 }}
                whileInView={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6, delay: index * 0.1 }}
                className="text-center"
              >
                <div className="w-12 h-12 bg-gradient-to-r from-purple-600 to-pink-600 text-white rounded-full flex items-center justify-center mx-auto mb-4 text-xl font-bold">
                  {item.step}
                </div>
                <h4 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">{item.title}</h4>
                <p className="text-gray-600 dark:text-gray-300">{item.description}</p>
              </motion.div>
            ))}
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <div className="flex items-center justify-center space-x-3 mb-4">
              <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                <Instagram className="w-6 h-6 text-white" />
              </div>
              <h3 className="text-2xl font-bold">SaveClip</h3>
            </div>
            <p className="text-gray-400 mb-6">
              Download Instagram content safely and securely. We are not affiliated with Instagram or Meta.
            </p>
            <div className="flex justify-center space-x-8 text-sm text-gray-400">
              <a href="#" className="hover:text-white transition-colors">Terms of Service</a>
              <a href="#" className="hover:text-white transition-colors">Privacy Policy</a>
              <a href="#" className="hover:text-white transition-colors">Contact</a>
            </div>
            <p className="text-gray-500 text-sm mt-6">
              © 2025 SaveClip. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
