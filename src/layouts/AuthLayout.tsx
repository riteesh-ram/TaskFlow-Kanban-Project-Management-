import React from 'react';

// Responsive auth wrapper: centers content, supports mobile padding and fluid width.
const AuthLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center px-4 py-8">
      <div className="w-full max-w-xl">{children}</div>
    </div>
  );
};

export default AuthLayout;
