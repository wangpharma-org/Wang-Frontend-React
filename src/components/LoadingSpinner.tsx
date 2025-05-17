// components/LoadingSpinner.tsx
const LoadingSpinner = () => {
  return (
    <div className="flex items-center justify-center h-screen">
      <div className="relative">
        <div className="h-24 w-24 rounded-full border-4 border-blue-200"></div>
        <div className="absolute top-0 left-0 h-24 w-24 rounded-full border-4 border-blue-500 border-t-transparent animate-spin"></div>
      </div>
      <p className="ml-4 text-lg text-gray-600">Loading statistics...</p>
    </div>
  );
};

export default LoadingSpinner;