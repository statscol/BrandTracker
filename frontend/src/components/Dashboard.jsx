import React, { useEffect, useState } from 'react';
import axios from 'axios';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell } from 'recharts';
import { Loader2, RefreshCw, Trophy, Clock, Target } from 'lucide-react';

const Dashboard = ({ videoId, onReset }) => {
    const [data, setData] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState('pending');

    const fetchData = async () => {
        try {
            // First check status
            const statusRes = await axios.get(`http://localhost:8000/videos/${videoId}`);
            setStatus(statusRes.data.status);

            if (statusRes.data.status === 'completed') {
                const reportRes = await axios.get(`http://localhost:8000/videos/${videoId}/report`);
                setData(reportRes.data);
                setLoading(false);
            } else if (statusRes.data.status === 'error') {
                setLoading(false);
            }
        } catch (err) {
            console.error(err);
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
        const interval = setInterval(() => {
            if (status !== 'completed' && status !== 'error') {
                fetchData();
            }
        }, 3000);
        return () => clearInterval(interval);
    }, [videoId, status]);

    if (loading || status === 'pending' || status === 'processing') {
        return (
            <div className="flex flex-col items-center justify-center py-20">
                <Loader2 className="w-16 h-16 text-blue-500 animate-spin mb-6" />
                <h2 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-purple-500">
                    Analyzing Match Footage...
                </h2>
                <p className="text-gray-400 mt-4 text-lg">Detecting brands and calculating screen time.</p>
                <div className="mt-8 flex gap-3 text-sm text-gray-600 bg-gray-800/50 px-6 py-3 rounded-full border border-gray-700">
                    <span className="flex items-center gap-2"><Target className="w-4 h-4" /> Object Detection</span>
                    <span className="w-px h-4 bg-gray-700" />
                    <span className="flex items-center gap-2"><Clock className="w-4 h-4" /> Temporal Analysis</span>
                </div>
            </div>
        );
    }

    if (status === 'error' || !data) {
        return (
            <div className="text-center py-20">
                <h2 className="text-2xl text-red-500 mb-4">Analysis Failed</h2>
                <button onClick={onReset} className="px-6 py-3 bg-gray-800 rounded-lg hover:bg-gray-700 transition">Try Again</button>
            </div>
        );
    }

    const topSponsor = data.sponsors.length > 0 ? data.sponsors[0] : null;

    return (
        <div className="animate-fade-in">
            <div className="flex justify-between items-center mb-8">
                <div>
                    <h2 className="text-3xl font-bold">Analysis Report</h2>
                    <p className="text-gray-400">Video ID: {videoId}</p>
                </div>
                <button onClick={onReset} className="flex items-center gap-2 px-4 py-2 bg-gray-800 rounded-lg hover:bg-gray-700 transition text-sm">
                    <RefreshCw className="w-4 h-4" /> Analyze New Video
                </button>
            </div>

            {/* Key Metrics Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2 text-yellow-500">
                        <Trophy className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">Hottest Sponsor</h3>
                    </div>
                    <p className="text-3xl font-bold">{topSponsor ? topSponsor.sponsor : 'N/A'}</p>
                    <p className="text-sm text-gray-500">{topSponsor ? `${topSponsor.duration_seconds.toFixed(1)}s on screen` : '-'}</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2 text-blue-400">
                        <Target className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">Total Detections</h3>
                    </div>
                    <p className="text-3xl font-bold">
                        {data.sponsors.reduce((acc, curr) => acc + curr.detections, 0)}
                    </p>
                    <p className="text-sm text-gray-500">Across all brands</p>
                </div>
                <div className="bg-gray-800/50 p-6 rounded-2xl border border-gray-700 backdrop-blur-sm">
                    <div className="flex items-center gap-3 mb-2 text-emerald-400">
                        <Clock className="w-6 h-6" />
                        <h3 className="font-semibold text-lg">Unique Brands</h3>
                    </div>
                    <p className="text-3xl font-bold">{data.sponsors.length}</p>
                    <p className="text-sm text-gray-500">Identified in footage</p>
                </div>
            </div>

            {/* Chart */}
            <div className="bg-gray-800/40 p-8 rounded-3xl border border-gray-700/50 mb-8">
                <h3 className="text-xl font-bold mb-6">Time-on-Screen by Sponsor</h3>
                <div className="h-80 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={data.sponsors.slice(0, 10)} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#374151" horizontal={false} />
                            <XAxis type="number" stroke="#9CA3AF" />
                            <YAxis dataKey="sponsor" type="category" width={100} stroke="#9CA3AF" />
                            <Tooltip
                                contentStyle={{ backgroundColor: '#1F2937', borderColor: '#374151', color: '#fff' }}
                                itemStyle={{ color: '#fff' }}
                                formatter={(value) => [`${value.toFixed(1)}s`, 'Duration']}
                            />
                            <Bar dataKey="duration_seconds" fill="#3B82F6" radius={[0, 4, 4, 0]}>
                                {data.sponsors.slice(0, 10).map((entry, index) => (
                                    <Cell key={`cell-${index}`} fill={['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B'][index % 4]} />
                                ))}
                            </Bar>
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </div>

            {/* Table Detail */}
            <div className="overflow-x-auto rounded-xl border border-gray-700 bg-gray-800/30">
                <table className="w-full text-left">
                    <thead className="bg-gray-800 text-gray-400 uppercase text-xs font-semibold">
                        <tr>
                            <th className="px-6 py-4">Sponsor</th>
                            <th className="px-6 py-4">Duration (s)</th>
                            <th className="px-6 py-4">Detections</th>
                            <th className="px-6 py-4">First Appearance</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700">
                        {data.sponsors.map((s, idx) => (
                            <tr key={idx} className="hover:bg-gray-700/50 transition">
                                <td className="px-6 py-4 font-medium">{s.sponsor}</td>
                                <td className="px-6 py-4 text-emerald-400 font-mono">{s.duration_seconds.toFixed(2)}s</td>
                                <td className="px-6 py-4">{s.detections}</td>
                                <td className="px-6 py-4 text-gray-500">{s.first_appearance.toFixed(1)}s</td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

        </div>
    );
};

export default Dashboard;
