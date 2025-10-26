
import React from 'react';

const Loader: React.FC = () => {
    return (
        <div className="flex justify-center items-center p-8">
            <svg className="h-12 w-12 text-cyan-500 animate-spin" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
                <circle cx="50" cy="50" r="45" stroke="currentColor" strokeWidth="10" strokeLinecap="round" strokeDasharray="283" strokeDashoffset="71" />
            </svg>
        </div>
    );
};

export default Loader;
