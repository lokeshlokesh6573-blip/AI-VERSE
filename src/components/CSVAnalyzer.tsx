'use client';

import React, { useEffect, useState } from 'react';
import Papa from 'papaparse';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer
} from 'recharts';

interface CSVAnalyzerProps {
  csvData: string;
}

export default function CSVAnalyzer({ csvData }: CSVAnalyzerProps) {
  const [data, setData] = useState<any[]>([]);
  const [columns, setColumns] = useState<string[]>([]);

  useEffect(() => {
    Papa.parse(csvData, {
      header: true,
      dynamicTyping: true,
      skipEmptyLines: true,
      complete: (results) => {
         if (results.data && results.data.length > 0) {
            setData(results.data);
            setColumns(Object.keys(results.data[0] as any));
         }
      }
    });
  }, [csvData]);

  if (data.length === 0 || columns.length < 2) {
     return <div className="text-white/50 text-xs font-mono p-4 bg-black/20 rounded">Insufficient numerical data to visualize.</div>;
  }

  // Attempt to find a suitable X and Y axis automatically
  const xAxisKey = columns[0];
  const yAxisKey = columns.find(key => typeof data[0][key] === 'number') || columns[1];

  return (
    <div className="w-full bg-black/40 border border-white/10 rounded-2xl p-4 my-4 flex flex-col space-y-4">
      <div className="flex justify-between items-center text-xs tracking-widest font-black uppercase text-blue-400">
         <span>Data Science Module</span>
         <span>Rows: {data.length}</span>
      </div>
      
      <div className="w-full h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data}>
            <CartesianGrid strokeDasharray="3 3" stroke="#333" />
            <XAxis dataKey={xAxisKey} stroke="#888" fontSize={10} tickMargin={10} />
            <YAxis stroke="#888" fontSize={10} width={40} />
            <Tooltip 
              contentStyle={{ backgroundColor: 'rgba(0,0,0,0.8)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '8px' }} 
              itemStyle={{ color: '#fff' }} 
            />
            <Line type="monotone" dataKey={yAxisKey} stroke="#3b82f6" strokeWidth={2} dot={{ r: 2, fill: '#ef4444' }} activeDot={{ r: 6 }} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div className="text-[10px] text-white/40 uppercase tracking-widest text-center mt-2">
         Visualizing: <span className="text-white">{yAxisKey}</span> over <span className="text-white">{xAxisKey}</span>
      </div>
    </div>
  );
}
