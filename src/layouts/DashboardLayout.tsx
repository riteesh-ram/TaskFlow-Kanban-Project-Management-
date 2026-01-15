import React from 'react';

const DashboardLayout: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <div className="min-h-screen bg-background flex flex-col">{children}</div>;
};

export default DashboardLayout;
