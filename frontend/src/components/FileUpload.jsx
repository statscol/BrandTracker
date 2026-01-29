import React, { useState, useCallback } from 'react';
import axios from 'axios';
import { Upload, FileVideo, Loader2, AlertCircle, Link, ArrowRight, Youtube } from 'lucide-react';
import { clsx } from 'clsx';

const FileUpload = ({ onUploadSuccess }) => {
    const [isDragging, setIsDragging] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [error, setError] = useState(null);
    const [url, setUrl] = useState('');

    const handleDrag = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setIsDragging(true);
        } else if (e.type === 'dragleave') {
            setIsDragging(false);
        }
    }, []);

    const handleDrop = useCallback((e) => {
        e.preventDefault();
        e.stopPropagation();
        setIsDragging(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleUpload(e.dataTransfer.files[0]);
        }
    }, []);

    const handleFileSelect = (e) => {
        if (e.target.files && e.target.files[0]) {
            handleUpload(e.target.files[0]);
        }
    };

    const handleUpload = async (file) => {
        setIsUploading(true);
        setError(null);
        const formData = new FormData();
        formData.append('file', file);

        try {
            const response = await axios.post('http://localhost:8000/upload', formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                },
            });
            onUploadSuccess(response.data.id);
        } catch (err) {
            setError('Failed to upload video. Please try again.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    const handleUrlUpload = async (e) => {
        e.preventDefault();
        if (!url) return;

        setIsUploading(true);
        setError(null);

        try {
            const response = await axios.post('http://localhost:8000/upload-url', { url });
            onUploadSuccess(response.data.id);
        } catch (err) {
            setError('Failed to process URL. Ensure it is a valid video link.');
            console.error(err);
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <div className="w-full max-w-xl mx-auto space-y-8">
            {/* File Upload Area */}
            <div
                className={clsx(
                    "relative border-2 border-dashed rounded-3xl p-12 transition-all duration-300 ease-in-out flex flex-col items-center justify-center cursor-pointer overflow-hidden bg-gray-900/50",
                    isDragging ? "border-emerald-500 bg-emerald-500/10 scale-105" : "border-gray-700 hover:border-emerald-500/50 hover:bg-gray-800",
                    isUploading && "pointer-events-none opacity-50"
                )}
                onDragEnter={handleDrag}
                onDragLeave={handleDrag}
                onDragOver={handleDrag}
                onDrop={handleDrop}
                onClick={() => !isUploading && document.getElementById('file-input').click()}
            >
                <input
                    id="file-input"
                    type="file"
                    className="hidden"
                    accept="video/*"
                    onChange={handleFileSelect}
                />

                {isUploading ? (
                    <div className="flex flex-col items-center animate-pulse">
                        <Loader2 className="w-16 h-16 text-emerald-500 animate-spin mb-4" />
                        <p className="text-xl font-semibold text-emerald-400">Processing...</p>
                        <p className="text-sm text-gray-500 mt-2">Uploading or Downloading content</p>
                    </div>
                ) : (
                    <>
                        <div className="w-20 h-20 bg-gray-800 rounded-full flex items-center justify-center mb-6 shadow-xl border border-gray-600 group-hover:border-emerald-500/50 transition-colors">
                            <Upload className="w-10 h-10 text-emerald-400" />
                        </div>
                        <h3 className="text-2xl font-bold mb-2">Upload Match Video</h3>
                        <p className="text-gray-400 text-center">
                            Drag & drop or click to browse
                        </p>
                    </>
                )}
            </div>

            <div className="flex items-center gap-4 text-gray-500">
                <div className="h-px bg-gray-700 flex-1"></div>
                <span>OR</span>
                <div className="h-px bg-gray-700 flex-1"></div>
            </div>

            {/* URL Input */}
            <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700">
                <div className="flex items-center gap-2 mb-4 text-emerald-400">
                    <Youtube className="w-5 h-5" />
                    <span className="font-semibold">Import from YouTube</span>
                </div>
                <form onSubmit={handleUrlUpload} className="flex gap-2">
                    <input
                        type="text"
                        value={url}
                        onChange={(e) => setUrl(e.target.value)}
                        placeholder="Paste YouTube link here..."
                        className="flex-1 bg-gray-900 border border-gray-600 rounded-xl px-4 py-3 focus:outline-none focus:border-emerald-500 transition-colors"
                        disabled={isUploading}
                    />
                    <button
                        type="submit"
                        disabled={!url || isUploading}
                        className="bg-emerald-600 hover:bg-emerald-500 text-white p-3 rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ArrowRight className="w-6 h-6" />
                    </button>
                </form>
            </div>

            {error && (
                <div className="flex items-center gap-3 bg-red-500/10 border border-red-500/20 text-red-400 p-4 rounded-xl animate-fade-in">
                    <AlertCircle className="w-5 h-5 flex-shrink-0" />
                    <p>{error}</p>
                </div>
            )}
        </div>
    );
};

export default FileUpload;
