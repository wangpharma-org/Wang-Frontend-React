import React, { useEffect, useState, useRef } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import dayjs from 'dayjs';
import axios from 'axios';
import Navbar from '../components/Navbar';

type FilterType = 'all' | 'today' | 'sevenDays' | 'thirtyDays' | 'limitDay';
type DateRange = {
  start: string;
  end: string;
};
interface ChartDataItem {
  id: number;
  date: string;
  sh_running: string;
  countOrderList: number;
  countOrderFloor2: number;
  countOrderFloor3: number;
  countOrderFloor4: number;
  countOrderFloor5: number;
  completed: boolean;
}

const Charts: React.FC = () => {
  const [visibleSeries, setVisibleSeries] = React.useState({
    floor5: false,
    floor4: false,
    floor3: false,
    floor2: false,
    completed: true,
    total: true
  });

  const [rawData, setRawData] = useState<ChartDataItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [activeFilter, setActiveFilter] = useState<FilterType>('all');
  const [dateRange, setDateRange] = useState<DateRange>({
    start: dayjs().subtract(7, 'day').format('YYYY-MM-DD'),
    end: dayjs().format('YYYY-MM-DD')
  });
  const [showDatePicker, setShowDatePicker] = useState(false);
  const plotRef = useRef<HTMLDivElement>(null);
  const uplotInstanceRef = useRef<uPlot | null>(null);
  const [tooltip, setTooltip] = useState<{
    show: boolean;
    x: number;
    y: number;
    content: string;
  }>({ show: false, x: 0, y: 0, content: '' });
  const lastTooltipDataRef = useRef<{ idx: number | null; content: string }>({ idx: null, content: '' });


  const handleData = async (dataType: FilterType, dateParams?: DateRange) => {
    setLoading(true);
    try {
      let url = `${import.meta.env.VITE_API_URL_ORDER}/api/order/report/graph?data=${dataType}`;

      if (dateParams && dateParams.start && dateParams.end) {
        url += `&date=${encodeURIComponent(JSON.stringify(dateParams))}`;
      }

      const response = await axios.get(url);
      const data = response.data;

      setRawData(data as ChartDataItem[]);
      setLoading(false);
    } catch (error) {
      console.error('❌ Error fetching chart data:', error);
      setRawData([]);
      setLoading(false);
    }
  };

  const handleFilterChange = (filterType: FilterType) => {
    setActiveFilter(filterType);
    if (filterType === 'limitDay') {
      setShowDatePicker(true);
    } else {
      setShowDatePicker(false);
      handleData(filterType);
    }
  };

  const handleDateRangeSubmit = () => {
    handleData('limitDay', dateRange);
    setShowDatePicker(false);
  };

  const showTooltip = React.useCallback((x: number, y: number, content: string, idx: number) => {
    if (lastTooltipDataRef.current.idx === idx && lastTooltipDataRef.current.content === content) {
      return;
    }

    lastTooltipDataRef.current = { idx, content };
    setTooltip({ show: true, x, y, content });
  }, []);

  const hideTooltip = React.useCallback(() => {
    lastTooltipDataRef.current = { idx: null, content: '' };
    setTooltip(prev => ({ ...prev, show: false }));
  }, []);

  const toggleSeries = (seriesName: keyof typeof visibleSeries) => {
    setVisibleSeries(prev => ({
      ...prev,
      [seriesName]: !prev[seriesName]
    }));
  };

  const displayData = React.useMemo(() => {
    const data = rawData.length > 0 ? rawData : [];
    return [...data].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [rawData]);

  const timestamps = displayData.map(item => new Date(item.date).getTime() / 1000);
  const totalData = React.useMemo(() => {
    let cumulativeTotal = 0;
    return displayData.map(item => {
      cumulativeTotal += item.countOrderList || 0;
      return cumulativeTotal;
    });
  }, [displayData]);

  const floor2Data = React.useMemo(() => {
    let cumulativeFloor2 = 0;
    return displayData.map(item => {
      cumulativeFloor2 += item.countOrderFloor2 || 0;
      return cumulativeFloor2;
    });
  }, [displayData]);

  const floor3Data = React.useMemo(() => {
    let cumulativeFloor3 = 0;
    return displayData.map(item => {
      cumulativeFloor3 += item.countOrderFloor3 || 0;
      return cumulativeFloor3;
    });
  }, [displayData]);

  const floor4Data = React.useMemo(() => {
    let cumulativeFloor4 = 0;
    return displayData.map(item => {
      cumulativeFloor4 += item.countOrderFloor4 || 0;
      return cumulativeFloor4;
    });
  }, [displayData]);

  const floor5Data = React.useMemo(() => {
    let cumulativeFloor5 = 0;
    return displayData.map(item => {
      cumulativeFloor5 += item.countOrderFloor5 || 0;
      return cumulativeFloor5;
    });
  }, [displayData]);

  const completedData = React.useMemo(() => {
    let cumulativeCompleted = 0;
    return displayData.map(item => {
      if (item.completed) {
        cumulativeCompleted += item.countOrderList || 0;
      }
      return cumulativeCompleted;
    });
  }, [displayData]);

  const chartData: uPlot.AlignedData = React.useMemo(() => [
    Float64Array.from(timestamps),
    ...(visibleSeries.total ? [Float64Array.from(totalData)] : []),
    ...(visibleSeries.completed ? [Float64Array.from(completedData)] : []),
    ...(visibleSeries.floor2 ? [Float64Array.from(floor2Data)] : []),
    ...(visibleSeries.floor3 ? [Float64Array.from(floor3Data)] : []),
    ...(visibleSeries.floor4 ? [Float64Array.from(floor4Data)] : []),
    ...(visibleSeries.floor5 ? [Float64Array.from(floor5Data)] : [])
  ], [
    timestamps,
    totalData,
    completedData,
    floor2Data,
    floor3Data,
    floor4Data,
    floor5Data,
    visibleSeries.total,
    visibleSeries.completed,
    visibleSeries.floor2,
    visibleSeries.floor3,
    visibleSeries.floor4,
    visibleSeries.floor5
  ]);

  const series = React.useMemo(() => [
    {},
    ...(visibleSeries.total ? [{
      label: 'ยอดสะสมทั้งหมด',
      stroke: '#8B5CF6',
      fill: 'rgba(139, 92, 246, 0.1)',
      width: 2,
    }] : []),
    ...(visibleSeries.completed ? [{
      label: 'ยอดสะสมเสร็จสิ้น',
      stroke: '#DC2626',
      fill: 'rgba(220, 38, 38, 0.1)',
      width: 2
    }] : []),
    ...(visibleSeries.floor2 ? [{
      label: 'ยอดสะสมชั้น 2',
      stroke: '#F59E0B',
      fill: 'rgba(245, 158, 11, 0.1)',
      width: 2
    }] : []),
    ...(visibleSeries.floor3 ? [{
      label: 'ยอดสะสมชั้น 3',
      stroke: '#3B82F6',
      fill: 'rgba(59, 130, 246, 0.1)',
      width: 2
    }] : []),
    ...(visibleSeries.floor4 ? [{
      label: 'ยอดสะสมชั้น 4',
      stroke: '#EF4444',
      fill: 'rgba(239, 68, 68, 0.1)',
      width: 2
    }] : []),
    ...(visibleSeries.floor5 ? [{
      label: 'ยอดสะสมชั้น 5',
      stroke: '#10B981',
      fill: 'rgba(16, 185, 129, 0.1)',
      width: 2
    }] : [])
  ], [visibleSeries]);


  useEffect(() => {
    if (!plotRef.current || chartData.length === 0 || chartData[0].length === 0) {
      return;
    }

    if (uplotInstanceRef.current) {
      uplotInstanceRef.current.destroy();
      uplotInstanceRef.current = null;
    }

    const opts: uPlot.Options = {
      width: plotRef.current.clientWidth,
      height: 400,
      series,
      axes: [
        {
          values: (_self: unknown, ticks: number[]) => {
            const isToday = activeFilter === 'today';
            const isSameDay = activeFilter === 'limitDay' && dateRange.start === dateRange.end;
            
            if (isToday || isSameDay) {
              return ticks.map((rawValue: number) => dayjs(rawValue * 1000).format('HH:mm'));
            } else {
              const uniqueDates = new Map();
              
              return ticks.map((rawValue: number) => {
                const date = dayjs(rawValue * 1000);
                const dateKey = date.format('DD/MM/YYYY');
                
                if (!uniqueDates.has(dateKey)) {
                  uniqueDates.set(dateKey, true);
                  return dateKey;
                }
                
                return '';
              });
            }
          },
          space: 80,
        },
        {
          label: 'ยอดสะสมออเดอร์',
          labelFont: '12px Arial',
        }
      ],
      legend: {
        show: true,
        live: false
      },
      cursor: {
        show: true,
        x: true,
        y: true,
        lock: true,
        focus: {
          prox: 16,
        },
        sync: {
          key: 'chart'
        }
      },
      hooks: {
        setCursor: [
          (self: uPlot) => {
            const { left, top, idx } = self.cursor;

            if (idx !== null && idx !== undefined && left !== null && top !== null && left !== undefined && top !== undefined) {
              const dataIndex = idx;
              if (dataIndex >= 0 && dataIndex < displayData.length) {
                const item = displayData[dataIndex];
                
                const totalValue = totalData[dataIndex] || 0;
                
                const content = `
                  <div class="font-medium text-sm mb-2">${dayjs(item.date).format('DD/MM/YYYY HH:mm')}</div>
                  <div class="text-xs mb-1">SH: ${item.sh_running}</div>
                  
                  <div class="border rounded p-2 bg-purple-50 mb-2">
                    <div class="font-medium text-purple-700 text-sm mb-1">📊 ยอดสะสมทั้งหมด</div>
                    <div class="text-lg font-bold text-purple-600">${totalValue.toLocaleString()} ออเดอร์</div>
                  </div>
                  
                  <div class="text-xs text-gray-600">
                    <div class="grid grid-cols-2 gap-1 mb-1">
                      <div>ชั้น 2: <span class="font-medium text-orange-600">${(item.countOrderFloor2 || 0).toLocaleString()}</span></div>
                      <div>ชั้น 3: <span class="font-medium text-blue-600">${(item.countOrderFloor3 || 0).toLocaleString()}</span></div>
                      <div>ชั้น 4: <span class="font-medium text-red-600">${(item.countOrderFloor4 || 0).toLocaleString()}</span></div>
                      <div>ชั้น 5: <span class="font-medium text-green-600">${(item.countOrderFloor5 || 0).toLocaleString()}</span></div>
                    </div>
                    <div class="border-t pt-1">
                      <div>รวมในช่วงนี้: <span class="font-medium">${(item.countOrderList || 0).toLocaleString()}</span></div>
                      <div>สถานะ: <span class="font-medium ${item.completed ? 'text-green-600' : 'text-yellow-600'}">${item.completed ? '✅ เสร็จสิ้น' : '⏳ ดำเนินการ'}</span></div>
                    </div>
                  </div>
                `;

                const rect = plotRef.current?.getBoundingClientRect();
                if (rect) {
                  showTooltip(
                    rect.left + left,
                    rect.top + top,
                    content,
                    dataIndex
                  );
                }
              }
            }
          }
        ]
      },
      select: {
        show: true,
        left: 0,
        top: 0,
        width: 0,
        height: 0
      }
    };

    const plot = new uPlot(opts, chartData, plotRef.current);
    uplotInstanceRef.current = plot;

    const handleResize = () => {
      if (plotRef.current && plot) {
        plot.setSize({ width: plotRef.current.clientWidth, height: 400 });
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (plot) {
        plot.destroy();
      }
    };
  }, [chartData, series, displayData, showTooltip, hideTooltip, visibleSeries, totalData, activeFilter, dateRange.start, dateRange.end]);

  useEffect(() => {
    handleData('all');
  }, []);

  return (
    <>
      <Navbar />
      <div className="min-h-screen bg-gray-100 p-6">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-3xl font-bold text-gray-900 mb-6">รายงานออเดอร์ตามวันที่</h1>

          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <div className="flex justify-between items-center mb-3">
              <h3 className="text-lg font-medium text-gray-800">เลือกช่วงเวลา</h3>

              <div className="flex items-center gap-2 text-sm">
                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded">
                  📊 {displayData.length} รายการ
                </span>
                {rawData.length < 500 && rawData.length > 0 && (
                  <span className="bg-green-100 text-green-800 px-2 py-1 rounded">
                    📊 Upsampled จาก {rawData.length}
                  </span>
                )}
                <button
                  onClick={() => {
                    if (activeFilter === 'limitDay') {
                      handleData('limitDay', dateRange);
                    } else {
                      handleData(activeFilter);
                    }
                  }}
                  disabled={loading}
                  className="bg-gray-100 hover:bg-gray-200 px-2 py-1 rounded text-gray-700 disabled:opacity-50"
                  title="รีเฟรชข้อมูล"
                >
                  🔄
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-3 mb-4">
              {[
                { key: 'all' as const, label: 'ทั้งหมด' },
                { key: 'today' as const, label: 'วันนี้' },
                { key: 'sevenDays' as const, label: '7 วัน' },
                { key: 'thirtyDays' as const, label: '30 วัน' },
                { key: 'limitDay' as const, label: 'กำหนดเอง' }
              ].map(({ key, label }) => (
                <button
                  key={key}
                  onClick={() => handleFilterChange(key)}
                  disabled={loading}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${activeFilter === key
                    ? 'bg-blue-500 text-white shadow-md'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {loading && activeFilter === key ? 'กำลังโหลด...' : label}
                </button>
              ))}
            </div>

            {showDatePicker && (
              <div className="border-t pt-4">
                <div className="flex flex-wrap gap-3 items-end">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันเริ่ม</label>
                    <input
                      type="date"
                      value={dateRange.start}
                      onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">วันสิ้นสุด</label>
                    <input
                      type="date"
                      value={dateRange.end}
                      onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                      className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                  <button
                    onClick={handleDateRangeSubmit}
                    disabled={loading}
                    className="px-4 py-2 bg-green-500 text-white rounded-md hover:bg-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {loading ? 'กำลังโหลด...' : 'แสดงข้อมูล'}
                  </button>
                </div>
              </div>
            )}
          </div>

          <div className="bg-white rounded-lg shadow-lg p-4 mb-4">
            <h3 className="text-lg font-medium text-gray-800 mb-3">เลือกข้อมูลที่ต้องการแสดง</h3>
            <div className="flex flex-wrap gap-3">
              {[
                { key: 'floor5' as const, label: 'ชั้น 5', color: '#10B981' },
                { key: 'floor4' as const, label: 'ชั้น 4', color: '#EF4444' },
                { key: 'floor3' as const, label: 'ชั้น 3', color: '#3B82F6' },
                { key: 'floor2' as const, label: 'ชั้น 2', color: '#F59E0B' },
              ].map(({ key, label, color }) => (
                <button
                  key={key}
                  onClick={() => toggleSeries(key)}
                  className={`px-4 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${visibleSeries[key]
                    ? 'text-white shadow-md'
                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    }`}
                  style={{
                    backgroundColor: visibleSeries[key] ? color : undefined
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-lg p-6 mb-6 pb-12">
            <h2 className="text-xl font-semibold text-gray-800 mb-4">กราฟแสดงข้อมูลออเดอร์</h2>

            {loading ? (
              <div className="flex justify-center items-center h-96">
                <div className="text-lg text-gray-600">🔄 กำลังโหลดข้อมูล...</div>
              </div>
            ) : displayData.length === 0 ? (
              <div className="flex flex-col justify-center items-center h-96 text-gray-500">
                <div className="text-6xl mb-4">📊</div>
                <div className="text-lg mb-2">ไม่มีข้อมูลในช่วงเวลาที่เลือก</div>
                <div className="text-sm">ลองเปลี่ยนตัวกรองหรือช่วงวันที่</div>
              </div>
            ) : (
              <>
                <div className="relative">
                  <div
                    ref={plotRef}
                    style={{ width: '100%', height: '400px' }}
                    onMouseLeave={hideTooltip}
                  />

                  {tooltip.show && (
                    <div
                      data-tooltip
                      className="fixed z-50 bg-white p-3 border rounded-lg shadow-lg max-w-sm transition-opacity duration-200"
                      style={{
                        left: tooltip.x,
                        top: tooltip.y,
                        transform: 'translateY(-100%)'
                      }}
                      dangerouslySetInnerHTML={{ __html: tooltip.content }}
                    />
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </>
  );
};

export default Charts;
