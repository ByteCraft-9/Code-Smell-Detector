import React from 'react';
import { Code2, Github } from 'lucide-react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          <div className="flex items-center">
            <Code2 className="h-8 w-8 text-primary-600" />
            <h1 className="ml-2 text-xl font-bold text-gray-900">
              C++ Code Smell Detector
            </h1>
          </div>
          
          <div className="flex items-center">
            
          </div>
        </div>
      </div>
    </header>
  );
};

export default Header;