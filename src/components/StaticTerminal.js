"use client";

import React from 'react';

const StaticTerminal = () => {
  const asciiArt = 
  `
    ██╗      █████╗ ███╗   ██╗ ██████╗████████╗███████╗██████╗ ███╗   ███╗
    ██║     ██╔══██╗████╗  ██║██╔════╝╚══██╔══╝██╔════╝██╔══██╗████╗ ████║
    ██║     ███████║██╔██╗ ██║██║  ███╗  ██║   █████╗  ██████╔╝██╔████╔██║
    ██║     ██╔══██║██║╚██╗██║██║   ██║  ██║   ██╔══╝  ██╔══██╗██║╚██╔╝██║
    ███████╗██║  ██║██║ ╚████║╚██████╔╝  ██║   ███████╗██║  ██║██║ ╚═╝ ██║
    ╚══════╝╚═╝  ╚═╝╚═╝  ╚═══╝ ╚═════╝   ╚═╝   ╚══════╝╚═╝  ╚═╝╚═╝     ╚═╝
 `;

  const promptText = "visitor@langterm:~$ Log In To Continue";

  return (
    <div className="w-[650px] h-[210px] mb-8">
      <div className="terminal-window w-full h-full flex flex-col">
        <div className="handle terminal-header p-2 flex justify-between items-center relative">
          <span className="font-mono absolute left-1/2 transform -translate-x-1/2">
            Welcome To
          </span>
          <div className="ml-auto flex gap-2">
            <button
              className="w-3 h-3 bg-yellow-400 rounded-full focus:outline-none"
              aria-label="Minimize Terminal"
            ></button>
            <button
              className="w-3 h-3 bg-red-500 rounded-full focus:outline-none"
              aria-label="Close Terminal"
            ></button>
          </div>
        </div>

        <div className="flex-1 bg-transparent p-2 text-green-400 overflow-auto whitespace-pre-wrap">
          <pre
            className="text-green-400"
            style={{
              fontFamily: "monospace",
              whiteSpace: "pre",
              lineHeight: "normal",
              letterSpacing: "normal",
              display: "block",
              flex: "none",
            }}
          >
            {asciiArt}
          </pre>
          <div className="flex relative mt-2">
            <span className="text-green-400">{promptText}</span>
            <span className="text-green-400">_</span>
            <span className="blinking-cursor">█</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StaticTerminal;