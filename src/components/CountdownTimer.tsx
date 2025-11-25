import { useState, useEffect } from "react";

interface CountdownTimerProps {
  endTime: string;
  className?: string;
  onExpire?: () => void;
  style?: "minimal" | "card" | "detail";
}

export default function CountdownTimer({ 
  endTime, 
  className = "", 
  onExpire,
  style = "card"
}: CountdownTimerProps) {
  const [timeLeft, setTimeLeft] = useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
    isExpired: boolean;
  }>({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: false });

  useEffect(() => {
    const calculateTimeLeft = () => {
      const difference = new Date(endTime).getTime() - new Date().getTime();
      
      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0, isExpired: true });
        if (onExpire) onExpire();
        return;
      }

      setTimeLeft({
        days: Math.floor(difference / (1000 * 60 * 60 * 24)),
        hours: Math.floor((difference / (1000 * 60 * 60)) % 24),
        minutes: Math.floor((difference / 1000 / 60) % 60),
        seconds: Math.floor((difference / 1000) % 60),
        isExpired: false
      });
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endTime, onExpire]);

  if (timeLeft.isExpired) {
    return <div className={`text-gray-500 font-medium ${className}`}>已結束</div>;
  }

  // Japanese Style Formatting
  if (style === "detail") {
    return (
      <div className={`flex items-end gap-2 text-red-600 font-bold ${className}`}>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-mono leading-none">{timeLeft.days}</span>
          <span className="text-xs text-gray-500">日</span>
        </div>
        <span className="text-xl mb-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-mono leading-none">{String(timeLeft.hours).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">時</span>
        </div>
        <span className="text-xl mb-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-mono leading-none">{String(timeLeft.minutes).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">分</span>
        </div>
        <span className="text-xl mb-1">:</span>
        <div className="flex flex-col items-center">
          <span className="text-3xl font-mono leading-none">{String(timeLeft.seconds).padStart(2, '0')}</span>
          <span className="text-xs text-gray-500">秒</span>
        </div>
        <span className="text-sm font-medium ml-2 mb-2 text-primary bg-primary/10 px-2 py-0.5 rounded">
          限定
        </span>
      </div>
    );
  }

  // Card style - more compact
  return (
    <div className={`flex items-center gap-1 text-sm font-medium text-red-600 ${className}`}>
      <span className="material-symbols-outlined text-base">timer</span>
      <span>
        {timeLeft.days > 0 && `${timeLeft.days}天 `}
        {String(timeLeft.hours).padStart(2, '0')}:
        {String(timeLeft.minutes).padStart(2, '0')}:
        {String(timeLeft.seconds).padStart(2, '0')}
      </span>
    </div>
  );
}
