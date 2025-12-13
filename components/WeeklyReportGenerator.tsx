
import React, { useState, useMemo } from 'react';
import { Project, Task, KPIMonthlyData, TaskStatus } from '../types';
import { Printer, FileText } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType, TextRun } from 'docx';
import FileSaver from 'file-saver';

interface WeeklyReportGeneratorProps {
  projects: Project[];
  tasks: Task[];
  kpiData: KPIMonthlyData[];
}

const WeeklyReportGenerator: React.FC<WeeklyReportGeneratorProps> = ({ projects, tasks, kpiData }) => {
  // Config State
  const [reportType] = useState<'WEEKLY' | 'MONTHLY'>('WEEKLY'); // Removed unused setter
  const [reportDate, setReportDate] = useState(new Date().toISOString().slice(0, 10)); // Current date picker
  
  // Custom Content Inputs
  const [customTasks, setCustomTasks] = useState('');
  const [customPlans, setCustomPlans] = useState('');

  // --- DATE HELPER LOGIC ---
  const dateInfo = useMemo(() => {
      const current = new Date(reportDate);
      const date = current.getDate();
      const month = current.getMonth() + 1;
      const year = current.getFullYear();

      // Week calculation: Date / 7 + 1 (Integer) as requested
      const weekNum = Math.floor(date / 7) + 1;

      // Calculate Monday and Sunday of the current week
      const dayOfWeek = current.getDay(); // 0 (Sun) - 6 (Sat)
      const diffToMon = current.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1); // Adjust when day is sunday
      
      const monday = new Date(current);
      monday.setDate(diffToMon);
      
      const sunday = new Date(monday);
      sunday.setDate(monday.getDate() + 6);

      return {
          weekNum,
          month,
          year,
          startDate: monday.toISOString().slice(0, 10),
          endDate: sunday.toISOString().slice(0, 10),
          startDateDisplay: monday.toLocaleDateString('vi-VN'),
          endDateDisplay: sunday.toLocaleDateString('vi-VN'),
          displayTitle: reportType === 'WEEKLY' 
            ? `TUẦN ${weekNum} THÁNG ${month}`
            : `THÁNG ${month}`
      };
  }, [reportDate, reportType]);

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val);

  // --- DATA PROCESSING ---

  // 1. KPI Data (Full data from subsystem)
  const currentKpi = useMemo(() => {
      // Logic: Match YYYY-MM
      const monthStr = dateInfo.endDate.slice(0, 7); 
      return kpiData.find(k => k.month === monthStr);
  }, [kpiData, dateInfo.endDate]);

  const kpiSummary = useMemo(() => {
      if (!currentKpi) return [];
      
      // Flatten structure for the table to show ALL data from the subsystem
      const rows: any[] = [];
      
      currentKpi.groups.forEach(g => {
          // Calculate group totals if autoCalculate is on, otherwise use stored values
          const groupTarget = g.autoCalculate 
            ? g.items.reduce((sum, i) => sum + (i.target || 0), 0)
            : (g.target || 0);
            
          const groupActual = g.autoCalculate
            ? g.items.reduce((sum, i) => sum + (i.actual || 0), 0)
            : (g.actual || 0);

          // Add Group Row
          rows.push({ 
              type: 'GROUP',
              name: g.name, 
              unit: g.unit, 
              target: groupTarget, 
              actual: groupActual,
              weight: g.weight
          });

          // Add Item Rows
          g.items.forEach(i => {
              rows.push({
                  type: 'ITEM',
                  name: i.name,
                  unit: i.unit,
                  target: i.target,
                  actual: i.actual,
                  weight: i.weight
              });
          });
      });
      return rows;
  }, [currentKpi]);

  // 2. Task Categorization
  const categorizedTasks = useMemo(() => {
      const start = dateInfo.startDate;
      const end = dateInfo.endDate;

      // Filter tasks active in range
      const inRangeTasks = tasks.filter(t => {
          const deadline = t.deadline;
          // Logic: Deadline in range OR In Progress status
          const isDueInRange = deadline >= start && deadline <= end;
          const isInProgress = t.status === TaskStatus.IN_PROGRESS;
          return isDueInRange || isInProgress;
      });

      const categories = {
          GOV: [] as Task[],   // Chính quyền
          EDU_MED: [] as Task[], // Y tế, Giáo dục
          INFRA: [] as Task[], // Hạ tầng số
          OTHER: [] as Task[]  // Khác
      };

      inRangeTasks.forEach(t => {
          const project = projects.find(p => p.id === t.projectId);
          // Combine text to search keywords
          const combinedText = `${t.name} ${project?.name || ''} ${project?.description || ''}`.toLowerCase();

          if (['chính quyền', 'ubnd', 'sở', 'bộ', 'công an', 'đô thị', 'hành chính công'].some(k => combinedText.includes(k))) {
              categories.GOV.push(t);
          } else if (['y tế', 'bệnh viện', 'giáo dục', 'trường', 'học sinh', 'sinh viên', 'syt', 'sgd', 'đại học'].some(k => combinedText.includes(k))) {
              categories.EDU_MED.push(t);
          } else if (['kênh truyền', 'internet', 'cloud', 'sms', 'hạ tầng', 'server', 'bulksms', 'đường truyền', 'thuê chỗ'].some(k => combinedText.includes(k))) {
              categories.INFRA.push(t);
          } else {
              categories.OTHER.push(t);
          }
      });

      return categories;
  }, [tasks, projects, dateInfo.startDate, dateInfo.endDate]);

  // 3. Key Projects (> 10 Billion)
  const keyProjects = useMemo(() => {
      return projects.filter(p => (p.plannedSales || 0) >= 10000000000);
  }, [projects]);

  const keyProjectProgress = useMemo(() => {
      return keyProjects.map(p => {
          const pTasks = tasks.filter(t => t.projectId === p.id && t.status !== TaskStatus.CANCELLED);
          const recentTasks = pTasks.sort((a,b) => b.deadline.localeCompare(a.deadline)).slice(0, 3);
          return { project: p, tasks: recentTasks };
      });
  }, [keyProjects, tasks]);

  // 4. Next Plan
  const nextPlans = useMemo(() => {
      // Logic: Tasks due next week
      const nextWeekStart = new Date(dateInfo.endDate);
      nextWeekStart.setDate(nextWeekStart.getDate() + 1);
      const nextWeekEnd = new Date(nextWeekStart);
      nextWeekEnd.setDate(nextWeekEnd.getDate() + 6);
      
      const s = nextWeekStart.toISOString().slice(0, 10);
      const e = nextWeekEnd.toISOString().slice(0, 10);

      return tasks.filter(t => 
          t.deadline >= s && t.deadline <= e && 
          t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED
      );
  }, [tasks, dateInfo.endDate]);

  // --- EXPORT FUNCTIONS ---

  const generateDocx = () => {
    const doc = new Document({
        sections: [{
            properties: {
                page: {
                    margin: {
                        top: 1440, // 1 inch
                        right: 1440,
                        bottom: 1440,
                        left: 1440,
                    }
                }
            },
            children: [
                new Paragraph({
                    text: `BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC LĨNH VỰC GPCNTT- VIETTEL HÀ NỘI ${dateInfo.displayTitle}`,
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: `(Từ ngày ${dateInfo.startDateDisplay} đến ngày ${dateInfo.endDateDisplay})`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),

                // I. KPI
                new Paragraph({ text: "I. KẾT QUẢ THỰC HIỆN CHỈ TIÊU:", heading: HeadingLevel.HEADING_2 }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Chỉ tiêu", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 40, type: WidthType.PERCENTAGE } }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Đơn vị", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Kế hoạch tháng", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Thực hiện", bold: true })], alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tỷ lệ", bold: true })], alignment: AlignmentType.CENTER })] }),
                            ],
                        }),
                        ...kpiSummary.map(item => new TableRow({
                            children: [
                                new TableCell({ 
                                    children: [new Paragraph({ 
                                        children: [new TextRun({ text: item.name, bold: item.type === 'GROUP' })],
                                        indent: item.type === 'ITEM' ? { left: 200 } : undefined 
                                    })] 
                                }),
                                new TableCell({ children: [new Paragraph({ text: item.unit || '', alignment: AlignmentType.CENTER })] }),
                                new TableCell({ children: [new Paragraph({ text: formatNumber(item.target), alignment: AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ text: formatNumber(item.actual), alignment: AlignmentType.RIGHT })] }),
                                new TableCell({ children: [new Paragraph({ text: item.target > 0 ? `${((item.actual/item.target)*100).toFixed(1)}%` : '-', alignment: AlignmentType.CENTER })] }),
                            ]
                        }))
                    ]
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // II. NHIỆM VỤ
                new Paragraph({ text: "II. THỰC HIỆN NHIỆM VỤ:", heading: HeadingLevel.HEADING_2 }),
                
                // 1. Chính quyền
                new Paragraph({ text: "1. Lĩnh vực Chính quyền:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.GOV.map((t) => new Paragraph({
                    text: `- ${t.name}: ${t.status === TaskStatus.COMPLETED ? 'Hoàn thành' : 'Đang thực hiện'}`,
                    indent: { left: 400 },
                    spacing: { after: 50 }
                })),
                ...(categorizedTasks.GOV.length === 0 ? [new Paragraph({ text: "(Không phát sinh)", indent: { left: 400 }, spacing: { after: 50 } })] : []),

                // 2. Y tế, Giáo dục
                new Paragraph({ text: "2. Lĩnh vực Y tế, Giáo dục:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.EDU_MED.map((t) => new Paragraph({
                    text: `- ${t.name}: ${t.status === TaskStatus.COMPLETED ? 'Hoàn thành' : 'Đang thực hiện'}`,
                    indent: { left: 400 },
                    spacing: { after: 50 }
                })),
                ...(categorizedTasks.EDU_MED.length === 0 ? [new Paragraph({ text: "(Không phát sinh)", indent: { left: 400 }, spacing: { after: 50 } })] : []),

                // 3. Hạ tầng số
                new Paragraph({ text: "3. Lĩnh vực Hạ tầng số (Kênh truyền, BulkSMS, Cloud...):", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.INFRA.map((t) => new Paragraph({
                    text: `- ${t.name}: ${t.status === TaskStatus.COMPLETED ? 'Hoàn thành' : 'Đang thực hiện'}`,
                    indent: { left: 400 },
                    spacing: { after: 50 }
                })),
                ...(categorizedTasks.INFRA.length === 0 ? [new Paragraph({ text: "(Không phát sinh)", indent: { left: 400 }, spacing: { after: 50 } })] : []),

                // 4. Khác + Custom
                new Paragraph({ text: "4. Nhiệm vụ khác:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.OTHER.map((t) => new Paragraph({
                    text: `- ${t.name}: ${t.status === TaskStatus.COMPLETED ? 'Hoàn thành' : 'Đang thực hiện'}`,
                    indent: { left: 400 },
                    spacing: { after: 50 }
                })),
                ...(customTasks ? customTasks.split('\n').map(line => new Paragraph({ text: line, indent: { left: 400 }, spacing: { after: 50 } })) : []),
                
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // III. DỰ ÁN TRỌNG ĐIỂM
                new Paragraph({ text: "III. TIẾN ĐỘ MỘT SỐ DỰ ÁN TRỌNG ĐIỂM (>10 TỶ):", heading: HeadingLevel.HEADING_2 }),
                ...keyProjectProgress.map(p => {
                    return [
                        new Paragraph({ children: [new TextRun({ text: `- Dự án: ${p.project.name} (Doanh số KH: ${formatCurrency(p.project.plannedSales || 0)})`, bold: true })] }),
                        ...p.tasks.map(t => new Paragraph({ text: `  + ${t.name}: ${t.status}`, indent: { left: 400 } }))
                    ]
                }).flat(),
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // IV. KẾ HOẠCH
                new Paragraph({ text: "IV. KẾ HOẠCH TUẦN TIẾP THEO:", heading: HeadingLevel.HEADING_2 }),
                ...nextPlans.map((t) => new Paragraph({
                    text: `- ${t.name} (Hạn: ${new Date(t.deadline).toLocaleDateString('vi-VN')})`,
                    bullet: { level: 0 },
                    spacing: { after: 50 }
                })),
                ...(customPlans ? customPlans.split('\n').map(line => new Paragraph({ text: line, bullet: { level: 0 } })) : []),
                new Paragraph({ text: "", spacing: { after: 400 } }),

                // FOOTER (Aligned Right, Centered Block)
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE}, insideVertical: {style: BorderStyle.NONE}, insideHorizontal: {style: BorderStyle.NONE} },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [], width: { size: 60, type: WidthType.PERCENTAGE } }), // Left spacer
                                new TableCell({ 
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "VIETTEL HÀ NỘI", bold: true })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ children: [new TextRun({ text: "NGƯỜI BÁO CÁO", bold: true })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ text: "", spacing: { after: 1200 } }), // Signature space
                                        new Paragraph({ children: [new TextRun({ text: "Nguyễn Văn Dũng", bold: true })], alignment: AlignmentType.CENTER })
                                    ],
                                    width: { size: 40, type: WidthType.PERCENTAGE } 
                                }),
                            ]
                        }),
                    ]
                })
            ]
        }]
    });

    Packer.toBlob(doc).then(blob => {
        // Safe check for saveAs: can be default export (function) or named property depending on build system
        const saveAs = (FileSaver as any).saveAs || FileSaver;
        saveAs(blob, `Bao_cao_${reportType}_${dateInfo.endDate}.docx`);
    });
  };

  const handlePrint = () => {
      window.print();
  };

  return (
    <div className="space-y-6">
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden">
            <div className="flex-1 space-y-4">
                <div className="flex gap-4 items-end">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">Ngày lập báo cáo (Hiện tại)</label>
                        <input 
                            type="date" 
                            className="p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EE0033] outline-none font-bold text-slate-700"
                            value={reportDate}
                            onChange={(e) => setReportDate(e.target.value)}
                        />
                    </div>
                    <div className="flex-1 pb-1">
                        <div className="text-sm text-slate-600">
                            Hệ thống tự động tính: <strong>{dateInfo.displayTitle}</strong>
                        </div>
                        <div className="text-xs text-slate-400">
                            Số liệu từ {dateInfo.startDateDisplay} đến {dateInfo.endDateDisplay}
                        </div>
                    </div>
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bổ sung Nhiệm vụ thực hiện (Mục II)</label>
                    <textarea 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EE0033] outline-none"
                        rows={3}
                        placeholder="Nhập thêm nội dung công việc khác..."
                        value={customTasks}
                        onChange={(e) => setCustomTasks(e.target.value)}
                    />
                </div>

                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Bổ sung Kế hoạch tiếp theo (Mục IV)</label>
                    <textarea 
                        className="w-full p-2 border border-slate-300 rounded-lg text-sm focus:ring-2 focus:ring-[#EE0033] outline-none"
                        rows={3}
                        placeholder="Nhập thêm kế hoạch..."
                        value={customPlans}
                        onChange={(e) => setCustomPlans(e.target.value)}
                    />
                </div>
            </div>

            <div className="flex flex-col gap-2 justify-start">
                <button 
                    onClick={generateDocx}
                    className="flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-3 rounded-lg font-bold shadow-sm hover:bg-blue-700 transition-colors"
                >
                    <FileText className="w-5 h-5" /> Xuất file Word (.docx)
                </button>
                <button 
                    onClick={handlePrint}
                    className="flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-3 rounded-lg font-bold shadow-sm hover:bg-slate-800 transition-colors"
                >
                    <Printer className="w-5 h-5" /> In / Lưu PDF
                </button>
                <div className="text-xs text-slate-500 mt-2 p-2 bg-slate-50 rounded border border-slate-200">
                    <p>* Lưu ý: Sử dụng chức năng "Lưu dưới dạng PDF" trong hộp thoại in để có chất lượng tốt nhất.</p>
                </div>
            </div>
        </div>

        {/* PREVIEW AREA (Visible on Screen & Print) */}
        <div className="bg-white p-10 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0">
            <div className="text-center mb-8">
                <h1 className="text-xl font-bold uppercase text-slate-900 leading-relaxed">
                    BÁO CÁO KẾT QUẢ THỰC HIỆN CÔNG VIỆC LĨNH VỰC GPCNTT- VIETTEL HÀ NỘI <br/>
                    {dateInfo.displayTitle}
                </h1>
                <p className="text-sm text-slate-600 mt-2 italic">
                    (Từ ngày {dateInfo.startDateDisplay} đến ngày {dateInfo.endDateDisplay})
                </p>
            </div>

            <div className="space-y-6 text-slate-900">
                {/* I */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">I. KẾT QUẢ THỰC HIỆN CHỈ TIÊU:</h2>
                    <table className="w-full border-collapse border border-slate-400 text-sm">
                        <thead>
                            <tr className="bg-slate-100">
                                <th className="border border-slate-400 p-2 text-left">Chỉ tiêu</th>
                                <th className="border border-slate-400 p-2 text-center">Đơn vị</th>
                                <th className="border border-slate-400 p-2 text-right">Kế hoạch tháng</th>
                                <th className="border border-slate-400 p-2 text-right">Thực hiện</th>
                                <th className="border border-slate-400 p-2 text-center">Tỷ lệ HT</th>
                            </tr>
                        </thead>
                        <tbody>
                            {kpiSummary.length > 0 ? kpiSummary.map((item, idx) => (
                                <tr key={idx} className={item.type === 'GROUP' ? 'bg-slate-50 font-semibold' : ''}>
                                    <td className={`border border-slate-400 p-2 ${item.type === 'ITEM' ? 'pl-6' : ''}`}>{item.name}</td>
                                    <td className="border border-slate-400 p-2 text-center">{item.unit}</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(item.target)}</td>
                                    <td className="border border-slate-400 p-2 text-right font-medium">{formatNumber(item.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-center font-bold">
                                        {item.target > 0 ? `${((item.actual/item.target)*100).toFixed(1)}%` : '-'}
                                    </td>
                                </tr>
                            )) : (
                                <tr><td colSpan={5} className="border border-slate-400 p-2 text-center italic">Chưa có dữ liệu KPI tháng này. Vui lòng cập nhật trong phần Điều hành chỉ tiêu.</td></tr>
                            )}
                        </tbody>
                    </table>
                </section>

                {/* II */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">II. THỰC HIỆN NHIỆM VỤ:</h2>
                    <div className="space-y-3 text-sm text-justify">
                        <div>
                            <h3 className="font-bold underline mb-1">1. Lĩnh vực Chính quyền:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.GOV.map(t => (
                                    <li key={t.id}><span className="font-medium">{t.name}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {categorizedTasks.GOV.length === 0 && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">2. Lĩnh vực Y tế, Giáo dục:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.EDU_MED.map(t => (
                                    <li key={t.id}><span className="font-medium">{t.name}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {categorizedTasks.EDU_MED.length === 0 && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">3. Lĩnh vực Hạ tầng số (Kênh truyền, BulkSMS, Cloud...):</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.INFRA.map(t => (
                                    <li key={t.id}><span className="font-medium">{t.name}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {categorizedTasks.INFRA.length === 0 && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">4. Nhiệm vụ khác:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.OTHER.map(t => (
                                    <li key={t.id}><span className="font-medium">{t.name}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {customTasks.split('\n').filter(line => line.trim()).map((line, i) => (
                                    <li key={`custom-${i}`}>{line}</li>
                                ))}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* III */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">III. TIẾN ĐỘ MỘT SỐ DỰ ÁN TRỌNG ĐIỂM ({'>'}10 TỶ):</h2>
                    <div className="space-y-3 text-sm text-justify">
                        {keyProjectProgress.map(p => (
                            <div key={p.project.id}>
                                <p className="font-bold underline mb-1">- Dự án: {p.project.name} (Doanh số KH: {formatCurrency(p.project.plannedSales || 0)})</p>
                                <ul className="list-[circle] pl-8 space-y-1">
                                    {p.tasks.length > 0 ? p.tasks.map(t => (
                                        <li key={t.id}>{t.name}: {t.status}</li>
                                    )) : <li className="italic text-slate-500">Chưa có nhiệm vụ cập nhật gần đây</li>}
                                </ul>
                            </div>
                        ))}
                        {keyProjectProgress.length === 0 && <p className="italic text-slate-500">Không có dự án trọng điểm nào đang triển khai.</p>}
                    </div>
                </section>

                {/* IV */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">IV. KẾ HOẠCH TUẦN TIẾP THEO:</h2>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-justify">
                        {nextPlans.map(t => (
                            <li key={t.id}>
                                {t.name} (Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')})
                            </li>
                        ))}
                        {customPlans.split('\n').filter(line => line.trim()).map((line, i) => (
                            <li key={`custom-plan-${i}`}>{line}</li>
                        ))}
                    </ul>
                </section>
            </div>

            {/* Footer */}
            <div className="mt-16 flex justify-end px-10 text-center break-inside-avoid">
                <div>
                    <p className="font-bold uppercase text-sm">VIETTEL HÀ NỘI</p>
                    <p className="font-bold uppercase text-sm mt-1">NGƯỜI BÁO CÁO</p>
                    <div className="h-24"></div>
                    <p className="font-bold text-sm">Nguyễn Văn Dũng</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default WeeklyReportGenerator;
