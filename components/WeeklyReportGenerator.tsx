
import React, { useState, useMemo, useEffect } from 'react';
import { Project, Task, KPIMonthlyData, TaskStatus, SavedReport, ReportPeriodType } from '../types';
import { Printer, FileText, Save, List, Plus, Search, Edit, Trash2, FileClock, Loader2 } from 'lucide-react';
import { Document, Packer, Paragraph, Table, TableRow, TableCell, WidthType, BorderStyle, HeadingLevel, AlignmentType, TextRun } from 'docx';
import FileSaver from 'file-saver';

interface WeeklyReportGeneratorProps {
  projects: Project[];
  tasks: Task[];
  kpiData: KPIMonthlyData[];
  savedReports?: SavedReport[];
  onSaveReport?: (r: SavedReport) => Promise<boolean>;
  onDeleteReport?: (id: string) => void;
}

const ReportManager: React.FC<WeeklyReportGeneratorProps> = ({ 
    projects, tasks, kpiData, 
    savedReports = [], onSaveReport, onDeleteReport 
}) => {
  // Mode: LIST (Manage) or EDITOR (Create/Edit)
  const [mode, setMode] = useState<'LIST' | 'EDITOR'>('LIST');
  const [searchTerm, setSearchTerm] = useState('');

  // Editor State
  const [reportId, setReportId] = useState<string | null>(null);
  const [reportTitle, setReportTitle] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  
  // Date Range (Defaults to current week)
  const today = new Date();
  const firstDay = new Date(today.setDate(today.getDate() - today.getDay() + 1)).toISOString().slice(0, 10);
  const lastDay = new Date(today.setDate(today.getDate() + 6)).toISOString().slice(0, 10);

  const [startDate, setStartDate] = useState(firstDay);
  const [endDate, setEndDate] = useState(lastDay);
  
  // Custom Content Inputs
  const [customGov, setCustomGov] = useState('');
  const [customEdu, setCustomEdu] = useState('');
  const [customInfra, setCustomInfra] = useState('');
  const [customOther, setCustomOther] = useState('');
  const [customPlans, setCustomPlans] = useState('');
  const [customProposals, setCustomProposals] = useState('');

  // Detect Report Type based on Date Range
  const reportType = useMemo(() => {
      const start = new Date(startDate);
      const end = new Date(endDate);
      const diffTime = Math.abs(end.getTime() - start.getTime());
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // Inclusive

      if (diffDays <= 10) return ReportPeriodType.WEEKLY;
      if (diffDays <= 35) return ReportPeriodType.MONTHLY;
      if (diffDays <= 100) return ReportPeriodType.QUARTERLY;
      if (diffDays > 300) return ReportPeriodType.YEARLY;
      return ReportPeriodType.CUSTOM;
  }, [startDate, endDate]);

  // --- DATE HELPERS ---
  const getQuarter = (d: Date) => {
      return Math.floor((d.getMonth() + 3) / 3);
  };

  // Generate Default Title
  useEffect(() => {
      // Only auto-generate title if we are creating a NEW report or just switched dates/types
      if (!reportId) {
          const s = new Date(startDate);
          const e = new Date(endDate);
          const year = e.getFullYear();
          let suffix = '';

          const baseTitle = "BÁO CÁO SXKD LĨNH VỰC GPCNTT- VIETTEL HÀ NỘI";

          if (reportType === ReportPeriodType.WEEKLY) {
              // Logic: Tuần thứ mấy trong tháng = Ngày của EndDate / 7 (làm tròn lên)
              const weekOfMonth = Math.ceil(e.getDate() / 7);
              const month = e.getMonth() + 1;
              suffix = `TUẦN ${weekOfMonth} THÁNG ${month}/${year}`;
          } else if (reportType === ReportPeriodType.MONTHLY) {
              const month = e.getMonth() + 1;
              const quarter = getQuarter(e);
              suffix = `THÁNG ${month} QUÝ ${quarter}/${year}`;
          } else if (reportType === ReportPeriodType.QUARTERLY) {
              const quarter = getQuarter(e);
              suffix = `QUÝ ${quarter}/${year}`;
          } else if (reportType === ReportPeriodType.YEARLY) {
              suffix = `NĂM ${year}`;
          } else {
              suffix = `GIAI ĐOẠN ${s.getDate()}/${s.getMonth()+1} - ${e.getDate()}/${e.getMonth()+1}/${year}`;
          }
          
          setReportTitle(`${baseTitle} ${suffix}`);
      }
  }, [startDate, endDate, reportType, reportId]);

  // --- ACTIONS ---

  const handleCreateNew = () => {
      setReportId(null);
      // Title will be auto-set by useEffect
      setStartDate(firstDay);
      setEndDate(lastDay);
      setCustomGov('');
      setCustomEdu('');
      setCustomInfra('');
      setCustomOther('');
      setCustomPlans('');
      setCustomProposals('');
      setMode('EDITOR');
  };

  const handleEditReport = (r: SavedReport) => {
      setReportId(r.id);
      setReportTitle(r.title);
      setStartDate(r.startDate);
      setEndDate(r.endDate);
      setCustomGov(r.content.customGov || '');
      setCustomEdu(r.content.customEdu || '');
      setCustomInfra(r.content.customInfra || '');
      setCustomOther(r.content.customOther || '');
      setCustomPlans(r.content.customPlans || '');
      setCustomProposals(r.content.customProposals || '');
      setMode('EDITOR');
  };

  const handleSaveToDB = async () => {
      if (!reportTitle.trim()) {
          alert("Vui lòng nhập tên báo cáo!");
          return;
      }

      if (!window.confirm("Bạn có chắc chắn muốn lưu báo cáo này vào hệ thống?")) {
          return;
      }
      
      if (onSaveReport) {
          setIsSaving(true);
          try {
              const reportToSave: SavedReport = {
                  id: reportId || `rpt_${Date.now()}`,
                  title: reportTitle,
                  periodType: reportType,
                  startDate,
                  endDate,
                  content: {
                      customGov, customEdu, customInfra, customOther, customPlans, customProposals
                  },
                  createdAt: reportId ? (savedReports.find(r => r.id === reportId)?.createdAt || new Date().toISOString()) : new Date().toISOString(),
                  updatedAt: new Date().toISOString()
              };
              
              // Wait for the parent/API to finish saving and check success status
              const success = await onSaveReport(reportToSave);
              
              if (success) {
                  alert("Đã lưu báo cáo thành công!");
                  setMode('LIST');
              }
              // If success is false, the api service likely already showed an alert, so we stay in editor mode
          } catch (error) {
              console.error("Save error:", error);
              alert("Có lỗi xảy ra khi lưu báo cáo. Vui lòng thử lại.");
          } finally {
              setIsSaving(false);
          }
      }
  };

  const handleDelete = (id: string) => {
      if (window.confirm("Bạn có chắc chắn muốn xóa báo cáo này?")) {
          if (onDeleteReport) onDeleteReport(id);
      }
  };

  // --- DATA PROCESSING (Reused Logic adapted for Date Range) ---

  const formatCurrency = (val: number) => new Intl.NumberFormat('vi-VN', { style: 'currency', currency: 'VND', maximumFractionDigits: 0 }).format(val);
  const formatNumber = (val: number) => new Intl.NumberFormat('vi-VN', { maximumFractionDigits: 2 }).format(val);

  // 1. KPI Data
  const kpiStats = useMemo(() => {
      const currentMonthStr = endDate.slice(0, 7); // YYYY-MM based on end date
      const currentYearStr = new Date(endDate).getFullYear().toString();

      const currentMonthData = kpiData.find(k => k.month === currentMonthStr);
      const yearData = kpiData.filter(k => k.month.startsWith(currentYearStr) && k.month <= currentMonthStr);

      const aggregate = (dataSet: KPIMonthlyData[]) => {
          let totalRevTarget = 0; let totalRevActual = 0;
          let serviceRevTarget = 0; let serviceRevActual = 0;
          let salesTarget = 0; let salesActual = 0;

          dataSet.forEach(month => {
              month.groups.forEach(g => {
                  const name = g.name.toUpperCase();
                  const target = g.autoCalculate ? g.items.reduce((s, i) => s + (i.target || 0), 0) : (g.target || 0);
                  const actual = g.autoCalculate ? g.items.reduce((s, i) => s + (i.actual || 0), 0) : (g.actual || 0);

                  if (name.includes('TỔNG DOANH THU')) {
                      totalRevTarget += target; totalRevActual += actual;
                  }
                  if (name.includes('DOANH THU DỊCH VỤ')) {
                      serviceRevTarget += target; serviceRevActual += actual;
                  }
                  if (name.includes('DOANH SỐ') || name.includes('DS')) {
                      salesTarget += target; salesActual += actual;
                  } else {
                      g.items.forEach(i => {
                          if (i.name.toUpperCase().includes('DOANH SỐ') || i.unit.toUpperCase() === 'DS') {
                              salesTarget += (i.target || 0); salesActual += (i.actual || 0);
                          }
                      });
                  }
              });
          });

          return {
              totalRev: { target: totalRevTarget, actual: totalRevActual, percent: totalRevTarget ? (totalRevActual/totalRevTarget)*100 : 0 },
              serviceRev: { target: serviceRevTarget, actual: serviceRevActual, percent: serviceRevTarget ? (serviceRevActual/serviceRevTarget)*100 : 0 },
              sales: { target: salesTarget, actual: salesActual, percent: salesTarget ? (salesActual/salesTarget)*100 : 0 },
          };
      };

      return {
          month: aggregate(currentMonthData ? [currentMonthData] : []),
          year: aggregate(yearData),
          detailGroups: currentMonthData ? currentMonthData.groups : [] // Export full detailed groups for table
      };
  }, [kpiData, endDate]);

  // 2. Task Categorization
  const formatTaskWithProject = (t: Task) => {
      const proj = projects.find(p => p.id === t.projectId);
      return `${t.name}${proj ? ` - Dự án: ${proj.name}` : ''}`;
  };

  const categorizedTasks = useMemo(() => {
      // Filter tasks active in range
      const inRangeTasks = tasks.filter(t => {
          const deadline = t.deadline;
          const isDueInRange = deadline >= startDate && deadline <= endDate;
          const isInProgress = t.status === TaskStatus.IN_PROGRESS;
          return isDueInRange || isInProgress;
      });

      const categories = { GOV: [] as Task[], EDU_MED: [] as Task[], INFRA: [] as Task[], OTHER: [] as Task[] };

      inRangeTasks.forEach(t => {
          const project = projects.find(p => p.id === t.projectId);
          const combinedText = `${t.name} ${project?.name || ''} ${project?.description || ''}`.toLowerCase();

          if (['chính quyền', 'ubnd', 'sở', 'bộ', 'công an', 'đô thị'].some(k => combinedText.includes(k))) categories.GOV.push(t);
          else if (['y tế', 'bệnh viện', 'giáo dục', 'trường', 'học sinh'].some(k => combinedText.includes(k))) categories.EDU_MED.push(t);
          else if (['kênh truyền', 'internet', 'cloud', 'sms', 'hạ tầng'].some(k => combinedText.includes(k))) categories.INFRA.push(t);
          else categories.OTHER.push(t);
      });
      return categories;
  }, [tasks, projects, startDate, endDate]);

  // 3. Key Projects
  const keyProjects = useMemo(() => projects.filter(p => {
      const sales = p.plannedSales || 0;
      const nameLower = p.name.toLowerCase();
      // Requirement: > 5 billion and exclude specific names (kênh truyền, bulksms)
      const isBigEnough = sales >= 5000000000;
      const isExcluded = 
          nameLower.includes('kênh truyền') || 
          nameLower.includes('bulksms') || 
          nameLower.includes('bulk sms'); // Added stricter check
      
      return isBigEnough && !isExcluded;
  }), [projects]);

  const keyProjectProgress = useMemo(() => keyProjects.map(p => {
      const pTasks = tasks.filter(t => t.projectId === p.id && t.status !== TaskStatus.CANCELLED);
      const recentTasks = pTasks.sort((a,b) => b.deadline.localeCompare(a.deadline)).slice(0, 3);
      return { project: p, tasks: recentTasks };
  }), [keyProjects, tasks]);

  // 4. Next Plan
  const nextPlans = useMemo(() => {
      const nextStart = new Date(endDate);
      nextStart.setDate(nextStart.getDate() + 1);
      const nextEnd = new Date(nextStart);
      nextEnd.setDate(nextEnd.getDate() + 6); // Look ahead 1 week by default
      
      const s = nextStart.toISOString().slice(0, 10);
      const e = nextEnd.toISOString().slice(0, 10);

      return tasks.filter(t => t.deadline >= s && t.deadline <= e && t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.CANCELLED);
  }, [tasks, endDate]);

  // --- EXPORT ---
  const generateDocx = () => {
    // Generate Rows for Detailed Table (Part I.2)
    const detailRows: TableRow[] = [
        // Header
        new TableRow({
            children: [
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 5, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 45, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "ĐVT", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "KH", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "TH", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 15, type: WidthType.PERCENTAGE } }),
                new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tỷ lệ", bold: true })], alignment: AlignmentType.CENTER })], width: { size: 10, type: WidthType.PERCENTAGE } }),
            ]
        })
    ];

    kpiStats.detailGroups.forEach((group, idx) => {
        // Group Header Row
        const groupTarget = group.autoCalculate ? group.items.reduce((s,i) => s + (i.target||0), 0) : (group.target || 0);
        const groupActual = group.autoCalculate ? group.items.reduce((s,i) => s + (i.actual||0), 0) : (group.actual || 0);
        const groupPercent = groupTarget > 0 ? (groupActual/groupTarget)*100 : 0;

        detailRows.push(
            new TableRow({
                children: [
                    new TableCell({ children: [new Paragraph({ text: `${['I','II','III','IV','V'][idx] || idx+1}`, alignment: AlignmentType.CENTER, style: "Heading3" })] }),
                    new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: group.name.toUpperCase(), bold: true })] })] }),
                    new TableCell({ children: [new Paragraph({ text: group.unit, alignment: AlignmentType.CENTER })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(groupTarget), alignment: AlignmentType.RIGHT })] }),
                    new TableCell({ children: [new Paragraph({ text: formatNumber(groupActual), alignment: AlignmentType.RIGHT })] }),
                    new TableCell({ children: [new Paragraph({ text: `${groupPercent.toFixed(1)}%`, alignment: AlignmentType.RIGHT })] }),
                ]
            })
        );

        // Item Rows
        group.items.forEach((item, itemIdx) => {
            const itemPercent = item.target > 0 ? (item.actual / item.target) * 100 : 0;
            detailRows.push(
                new TableRow({
                    children: [
                        new TableCell({ children: [new Paragraph({ text: `${itemIdx + 1}`, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: item.name })] }),
                        new TableCell({ children: [new Paragraph({ text: item.unit, alignment: AlignmentType.CENTER })] }),
                        new TableCell({ children: [new Paragraph({ text: formatNumber(item.target), alignment: AlignmentType.RIGHT })] }),
                        new TableCell({ children: [new Paragraph({ text: formatNumber(item.actual), alignment: AlignmentType.RIGHT })] }),
                        new TableCell({ children: [new Paragraph({ text: `${itemPercent.toFixed(1)}%`, alignment: AlignmentType.RIGHT })] }),
                    ]
                })
            );
        });
    });

    const doc = new Document({
        sections: [{
            properties: { page: { margin: { top: 1440, right: 1440, bottom: 1440, left: 1440 } } },
            children: [
                new Paragraph({
                    text: reportTitle.toUpperCase(),
                    heading: HeadingLevel.HEADING_1,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 200 }
                }),
                new Paragraph({
                    text: `(Từ ngày ${new Date(startDate).toLocaleDateString('vi-VN')} đến ngày ${new Date(endDate).toLocaleDateString('vi-VN')})`,
                    alignment: AlignmentType.CENTER,
                    spacing: { after: 400 }
                }),
                
                // I. KPI
                new Paragraph({ text: "I. KẾT QUẢ THỰC HIỆN CHỈ TIÊU:", heading: HeadingLevel.HEADING_2 }),
                
                // I.1. Summary
                new Paragraph({ text: "1. Kết quả lũy kế đến ngày:", heading: HeadingLevel.HEADING_3, spacing: { after: 100 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: [
                        new TableRow({ children: [
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Nội dung", bold: true })], alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Lũy kế Năm", bold: true })], alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Lũy kế Tháng", bold: true })], alignment: AlignmentType.CENTER })] }),
                            new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "Tỷ lệ HT (Năm/Tháng)", bold: true })], alignment: AlignmentType.CENTER })] }),
                        ]}),
                        new TableRow({ children: [
                            new TableCell({ children: [new Paragraph("Tổng Doanh thu")] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.year.totalRev.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.month.totalRev.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: `${kpiStats.year.totalRev.percent.toFixed(1)}% / ${kpiStats.month.totalRev.percent.toFixed(1)}%`, alignment: AlignmentType.CENTER })] }),
                        ]}),
                         new TableRow({ children: [
                            new TableCell({ children: [new Paragraph("Doanh thu Dịch vụ")] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.year.serviceRev.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.month.serviceRev.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: `${kpiStats.year.serviceRev.percent.toFixed(1)}% / ${kpiStats.month.serviceRev.percent.toFixed(1)}%`, alignment: AlignmentType.CENTER })] }),
                        ]}),
                        new TableRow({ children: [
                            new TableCell({ children: [new Paragraph("Tổng Doanh số")] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.year.sales.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: formatNumber(kpiStats.month.sales.actual), alignment: AlignmentType.RIGHT })] }),
                            new TableCell({ children: [new Paragraph({ text: `${kpiStats.year.sales.percent.toFixed(1)}% / ${kpiStats.month.sales.percent.toFixed(1)}%`, alignment: AlignmentType.CENTER })] }),
                        ]}),
                    ]
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // I.2. Details
                new Paragraph({ text: "2. Kết quả thực hiện chi tiết:", heading: HeadingLevel.HEADING_3, spacing: { after: 100 } }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    rows: detailRows
                }),
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // II. Tasks
                new Paragraph({ text: "II. THỰC HIỆN NHIỆM VỤ:", heading: HeadingLevel.HEADING_2 }),
                new Paragraph({ text: "1. Lĩnh vực Chính quyền:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.GOV.map(t => new Paragraph({ text: `- ${formatTaskWithProject(t)}: ${t.status}`, indent: { left: 400 } })),
                ...(customGov ? customGov.split('\n').map(l => new Paragraph({ text: l, indent: { left: 400 } })) : []),
                
                new Paragraph({ text: "2. Lĩnh vực Y tế, Giáo dục:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.EDU_MED.map(t => new Paragraph({ text: `- ${formatTaskWithProject(t)}: ${t.status}`, indent: { left: 400 } })),
                ...(customEdu ? customEdu.split('\n').map(l => new Paragraph({ text: l, indent: { left: 400 } })) : []),

                new Paragraph({ text: "3. Lĩnh vực Hạ tầng số:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.INFRA.map(t => new Paragraph({ text: `- ${formatTaskWithProject(t)}: ${t.status}`, indent: { left: 400 } })),
                ...(customInfra ? customInfra.split('\n').map(l => new Paragraph({ text: l, indent: { left: 400 } })) : []),

                new Paragraph({ text: "4. Khác:", heading: HeadingLevel.HEADING_3 }),
                ...categorizedTasks.OTHER.map(t => new Paragraph({ text: `- ${formatTaskWithProject(t)}: ${t.status}`, indent: { left: 400 } })),
                ...(customOther ? customOther.split('\n').map(l => new Paragraph({ text: l, indent: { left: 400 } })) : []),

                new Paragraph({ text: "", spacing: { after: 200 } }),

                // III. Key Projects
                new Paragraph({ text: "III. TIẾN ĐỘ MỘT SỐ DỰ ÁN TRỌNG ĐIỂM (>5 TỶ):", heading: HeadingLevel.HEADING_2 }),
                ...keyProjectProgress.flatMap(p => [
                    new Paragraph({ children: [new TextRun({ text: `- Dự án: ${p.project.name}`, bold: true })] }),
                    ...p.tasks.map(t => new Paragraph({ text: `  + ${t.name}: ${t.status}`, indent: { left: 400 } }))
                ]),
                new Paragraph({ text: "", spacing: { after: 200 } }),

                // IV. Next Plan
                new Paragraph({ text: "IV. KẾ HOẠCH TUẦN TIẾP THEO:", heading: HeadingLevel.HEADING_2 }),
                ...nextPlans.map(t => new Paragraph({ text: `- ${formatTaskWithProject(t)}`, bullet: { level: 0 } })),
                ...(customPlans ? customPlans.split('\n').map(l => new Paragraph({ text: l, bullet: { level: 0 } })) : []),
                
                // V. Proposals
                new Paragraph({ text: "V. KKVM VÀ KIẾN NGHỊ, ĐỀ XUẤT:", heading: HeadingLevel.HEADING_2 }),
                ...(customProposals ? customProposals.split('\n').map(l => new Paragraph({ text: l, bullet: { level: 0 } })) : [new Paragraph({ text: "N/A", indent: { left: 400 } })]),

                new Paragraph({ text: "", spacing: { after: 400 } }),
                
                // Footer
                new Paragraph({ 
                    text: `Trên đây là báo cáo của Viettel Hà Nội. Kính xin ý kiến định hướng, chỉ đạo để thực hiện.`,
                    alignment: AlignmentType.JUSTIFIED,
                    spacing: { after: 400 }
                }),
                new Table({
                    width: { size: 100, type: WidthType.PERCENTAGE },
                    borders: { top: {style: BorderStyle.NONE}, bottom: {style: BorderStyle.NONE}, left: {style: BorderStyle.NONE}, right: {style: BorderStyle.NONE}, insideVertical: {style: BorderStyle.NONE}, insideHorizontal: {style: BorderStyle.NONE} },
                    rows: [
                        new TableRow({
                            children: [
                                new TableCell({ children: [], width: { size: 60, type: WidthType.PERCENTAGE } }),
                                new TableCell({ 
                                    children: [
                                        new Paragraph({ children: [new TextRun({ text: "VIETTEL HÀ NỘI", bold: true })], alignment: AlignmentType.CENTER }),
                                        new Paragraph({ text: "", spacing: { after: 1200 } }),
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
        const saveAs = (FileSaver as any).saveAs || FileSaver;
        saveAs(blob, `${reportTitle.replace(/[^a-z0-9]/gi, '_')}.docx`);
    });
  };

  const handlePrint = () => {
      window.print();
  };

  // --- RENDER ---

  if (mode === 'LIST') {
      const filteredReports = savedReports.filter(r => r.title.toLowerCase().includes(searchTerm.toLowerCase()));

      return (
          <div className="space-y-6 animate-in fade-in">
              <div className="flex justify-between items-center">
                  <h1 className="text-2xl font-bold text-slate-800">Quản lý Báo cáo</h1>
                  <button onClick={handleCreateNew} className="bg-indigo-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-indigo-700 shadow-sm font-medium">
                      <Plus className="w-5 h-5" /> Tạo báo cáo mới
                  </button>
              </div>

              <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                  <div className="relative mb-4">
                      <Search className="w-5 h-5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                      <input 
                          type="text" 
                          placeholder="Tìm kiếm báo cáo..."
                          className="w-full pl-10 pr-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-indigo-500"
                          value={searchTerm}
                          onChange={e => setSearchTerm(e.target.value)}
                      />
                  </div>

                  <div className="overflow-x-auto">
                      <table className="w-full text-left text-sm">
                          <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                              <tr>
                                  <th className="px-4 py-3">Tên báo cáo</th>
                                  <th className="px-4 py-3">Loại</th>
                                  <th className="px-4 py-3">Giai đoạn</th>
                                  <th className="px-4 py-3">Ngày tạo</th>
                                  <th className="px-4 py-3 text-right">Thao tác</th>
                              </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100">
                              {filteredReports.length === 0 ? (
                                  <tr><td colSpan={5} className="px-4 py-8 text-center text-slate-400">Chưa có báo cáo nào.</td></tr>
                              ) : filteredReports.map(r => (
                                  <tr key={r.id} className="hover:bg-slate-50">
                                      <td className="px-4 py-3 font-medium text-slate-800">{r.title}</td>
                                      <td className="px-4 py-3">
                                          <span className={`px-2 py-1 rounded text-xs font-bold ${
                                              r.periodType === ReportPeriodType.WEEKLY ? 'bg-blue-100 text-blue-700' :
                                              r.periodType === ReportPeriodType.MONTHLY ? 'bg-green-100 text-green-700' :
                                              r.periodType === ReportPeriodType.QUARTERLY ? 'bg-orange-100 text-orange-700' :
                                              'bg-slate-100 text-slate-700'
                                          }`}>
                                              {r.periodType}
                                          </span>
                                      </td>
                                      <td className="px-4 py-3 text-slate-600">
                                          {new Date(r.startDate).toLocaleDateString('vi-VN')} - {new Date(r.endDate).toLocaleDateString('vi-VN')}
                                      </td>
                                      <td className="px-4 py-3 text-slate-500">
                                          {new Date(r.createdAt).toLocaleDateString('vi-VN')}
                                      </td>
                                      <td className="px-4 py-3 text-right">
                                          <div className="flex justify-end gap-2">
                                              <button onClick={() => handleEditReport(r)} className="p-1.5 bg-white border rounded hover:bg-indigo-50 text-indigo-600 shadow-sm"><Edit className="w-4 h-4" /></button>
                                              <button onClick={() => handleDelete(r.id)} className="p-1.5 bg-white border rounded hover:bg-red-50 text-red-600 shadow-sm"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                      </td>
                                  </tr>
                              ))}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      );
  }

  // --- EDITOR MODE ---
  return (
    <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
        {/* Editor Toolbar */}
        <div className="flex flex-col md:flex-row gap-4 bg-white p-4 rounded-xl border border-slate-200 shadow-sm print:hidden items-start md:items-center justify-between sticky top-0 z-20">
            <div className="flex items-center gap-4 w-full md:w-auto">
                <button onClick={() => setMode('LIST')} className="p-2 hover:bg-slate-100 rounded-full text-slate-500"><List className="w-6 h-6" /></button>
                <div className="flex-1">
                    <input 
                        type="text" 
                        className="text-lg font-bold text-slate-800 border-none outline-none w-full bg-transparent placeholder-slate-400 focus:ring-0 min-w-[300px]"
                        value={reportTitle}
                        onChange={e => setReportTitle(e.target.value)}
                        placeholder="Nhập tên báo cáo..."
                    />
                    <div className="flex items-center gap-2 text-xs text-slate-500 mt-1">
                        <span className={`px-1.5 py-0.5 rounded font-bold ${
                            reportType === 'WEEKLY' ? 'bg-blue-100 text-blue-700' : 
                            reportType === 'MONTHLY' ? 'bg-green-100 text-green-700' : 'bg-slate-100'
                        }`}>{reportType}</span>
                        <span>•</span>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="bg-transparent outline-none cursor-pointer hover:text-indigo-600" />
                        <span>-</span>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="bg-transparent outline-none cursor-pointer hover:text-indigo-600" />
                    </div>
                </div>
            </div>

            <div className="flex gap-2 w-full md:w-auto">
                <button 
                    onClick={handleSaveToDB} 
                    disabled={isSaving}
                    className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-emerald-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-emerald-700 transition-colors shadow-sm disabled:opacity-50"
                >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    {isSaving ? 'Đang lưu...' : 'Lưu'}
                </button>
                <button onClick={generateDocx} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition-colors shadow-sm">
                    <FileText className="w-4 h-4" /> Word
                </button>
                <button onClick={handlePrint} className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-slate-700 text-white px-4 py-2 rounded-lg font-bold hover:bg-slate-800 transition-colors shadow-sm">
                    <Printer className="w-4 h-4" /> In
                </button>
            </div>
        </div>

        {/* Input Form */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 print:hidden">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><Edit className="w-4 h-4" /> Nhập liệu Nhiệm vụ</h3>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Chính quyền</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customGov} onChange={e => setCustomGov(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Y tế - Giáo dục</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customEdu} onChange={e => setCustomEdu(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Hạ tầng số</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customInfra} onChange={e => setCustomInfra(e.target.value)} />
                </div>
            </div>
            
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-slate-700 flex items-center gap-2"><FileClock className="w-4 h-4" /> Kế hoạch & Kiến nghị</h3>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Nhiệm vụ Khác</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customOther} onChange={e => setCustomOther(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kế hoạch tiếp theo</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customPlans} onChange={e => setCustomPlans(e.target.value)} />
                </div>
                <div>
                    <label className="block text-xs font-bold text-slate-500 mb-1">Kiến nghị, Đề xuất</label>
                    <textarea className="w-full p-2 border rounded-lg text-xs h-20" placeholder="Nhập thêm..." value={customProposals} onChange={e => setCustomProposals(e.target.value)} />
                </div>
            </div>
        </div>

        {/* PREVIEW AREA (This is what gets printed) */}
        <div className="bg-white p-10 shadow-lg mx-auto max-w-[210mm] min-h-[297mm] print:shadow-none print:w-full print:max-w-none print:p-0 text-slate-900 border border-slate-200">
            <div className="text-center mb-8">
                <h1 className="text-xl font-bold uppercase leading-relaxed">
                    {reportTitle}
                </h1>
                <p className="text-sm text-slate-600 mt-2 italic">
                    (Giai đoạn: {new Date(startDate).toLocaleDateString('vi-VN')} - {new Date(endDate).toLocaleDateString('vi-VN')})
                </p>
            </div>

            <div className="space-y-6">
                {/* I. KPI */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">I. KẾT QUẢ THỰC HIỆN CHỈ TIÊU:</h2>
                    
                    <h3 className="text-sm font-bold underline mb-1">1. Kết quả lũy kế đến ngày:</h3>
                    <div className="mb-4">
                        <table className="w-full border-collapse border border-slate-400 text-sm">
                            <thead className="bg-slate-100 font-bold">
                                <tr>
                                    <th className="border border-slate-400 p-2">Nội dung</th>
                                    <th className="border border-slate-400 p-2 text-right">Lũy kế Năm</th>
                                    <th className="border border-slate-400 p-2 text-right">Lũy kế Tháng</th>
                                    <th className="border border-slate-400 p-2 text-center">Tỷ lệ HT (Năm/Tháng)</th>
                                </tr>
                            </thead>
                            <tbody>
                                <tr>
                                    <td className="border border-slate-400 p-2">Tổng Doanh thu</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.year.totalRev.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.month.totalRev.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-center">{kpiStats.year.totalRev.percent.toFixed(1)}% / {kpiStats.month.totalRev.percent.toFixed(1)}%</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-2">Doanh thu Dịch vụ</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.year.serviceRev.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.month.serviceRev.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-center">{kpiStats.year.serviceRev.percent.toFixed(1)}% / {kpiStats.month.serviceRev.percent.toFixed(1)}%</td>
                                </tr>
                                <tr>
                                    <td className="border border-slate-400 p-2">Tổng Doanh số</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.year.sales.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-right">{formatNumber(kpiStats.month.sales.actual)}</td>
                                    <td className="border border-slate-400 p-2 text-center">{kpiStats.year.sales.percent.toFixed(1)}% / {kpiStats.month.sales.percent.toFixed(1)}%</td>
                                </tr>
                            </tbody>
                        </table>
                    </div>

                    <h3 className="text-sm font-bold underline mb-1">2. Kết quả thực hiện chi tiết:</h3>
                    <div className="mb-4">
                        <table className="w-full border-collapse border border-slate-400 text-sm">
                            <thead className="bg-slate-100 font-bold">
                                <tr>
                                    <th className="border border-slate-400 p-2 w-8">TT</th>
                                    <th className="border border-slate-400 p-2">Nội dung</th>
                                    <th className="border border-slate-400 p-2 w-16 text-center">ĐVT</th>
                                    <th className="border border-slate-400 p-2 w-24 text-right">KH</th>
                                    <th className="border border-slate-400 p-2 w-24 text-right">TH</th>
                                    <th className="border border-slate-400 p-2 w-20 text-right">Tỷ lệ</th>
                                </tr>
                            </thead>
                            <tbody>
                                {kpiStats.detailGroups.map((group, idx) => {
                                    const groupTarget = group.autoCalculate ? group.items.reduce((s,i) => s + (i.target||0), 0) : (group.target || 0);
                                    const groupActual = group.autoCalculate ? group.items.reduce((s,i) => s + (i.actual||0), 0) : (group.actual || 0);
                                    const groupPercent = groupTarget > 0 ? (groupActual/groupTarget)*100 : 0;

                                    return (
                                        <React.Fragment key={group.id}>
                                            <tr className="bg-slate-50 font-bold">
                                                <td className="border border-slate-400 p-2 text-center">{['I','II','III','IV','V'][idx] || idx+1}</td>
                                                <td className="border border-slate-400 p-2 uppercase">{group.name}</td>
                                                <td className="border border-slate-400 p-2 text-center">{group.unit}</td>
                                                <td className="border border-slate-400 p-2 text-right">{formatNumber(groupTarget)}</td>
                                                <td className="border border-slate-400 p-2 text-right">{formatNumber(groupActual)}</td>
                                                <td className="border border-slate-400 p-2 text-right">{groupPercent.toFixed(1)}%</td>
                                            </tr>
                                            {group.items.map((item, itemIdx) => {
                                                const itemPercent = item.target > 0 ? (item.actual / item.target) * 100 : 0;
                                                return (
                                                    <tr key={item.id}>
                                                        <td className="border border-slate-400 p-2 text-center text-slate-500">{itemIdx + 1}</td>
                                                        <td className="border border-slate-400 p-2">{item.name}</td>
                                                        <td className="border border-slate-400 p-2 text-center text-slate-500">{item.unit}</td>
                                                        <td className="border border-slate-400 p-2 text-right">{formatNumber(item.target)}</td>
                                                        <td className="border border-slate-400 p-2 text-right">{formatNumber(item.actual)}</td>
                                                        <td className="border border-slate-400 p-2 text-right">{itemPercent.toFixed(1)}%</td>
                                                    </tr>
                                                );
                                            })}
                                        </React.Fragment>
                                    );
                                })}
                            </tbody>
                        </table>
                    </div>
                </section>

                {/* II. Tasks */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">II. THỰC HIỆN NHIỆM VỤ:</h2>
                    <div className="space-y-3 text-sm text-justify">
                        <div>
                            <h3 className="font-bold underline mb-1">1. Lĩnh vực Chính quyền:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.GOV.map(t => (
                                    <li key={t.id}><span className="font-medium">{formatTaskWithProject(t)}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {customGov && customGov.split('\n').map((l, i) => <li key={`g-${i}`}>{l}</li>)}
                                {categorizedTasks.GOV.length === 0 && !customGov && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">2. Lĩnh vực Y tế, Giáo dục:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.EDU_MED.map(t => (
                                    <li key={t.id}><span className="font-medium">{formatTaskWithProject(t)}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {customEdu && customEdu.split('\n').map((l, i) => <li key={`e-${i}`}>{l}</li>)}
                                {categorizedTasks.EDU_MED.length === 0 && !customEdu && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">3. Lĩnh vực Hạ tầng số:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.INFRA.map(t => (
                                    <li key={t.id}><span className="font-medium">{formatTaskWithProject(t)}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {customInfra && customInfra.split('\n').map((l, i) => <li key={`i-${i}`}>{l}</li>)}
                                {categorizedTasks.INFRA.length === 0 && !customInfra && <li className="italic text-slate-500">Không phát sinh</li>}
                            </ul>
                        </div>
                        <div>
                            <h3 className="font-bold underline mb-1">4. Nhiệm vụ khác:</h3>
                            <ul className="list-disc pl-5 space-y-1">
                                {categorizedTasks.OTHER.map(t => (
                                    <li key={t.id}><span className="font-medium">{formatTaskWithProject(t)}</span>: {t.status === TaskStatus.COMPLETED ? 'Xong' : 'Đang thực hiện'}</li>
                                ))}
                                {customOther && customOther.split('\n').map((l, i) => <li key={`o-${i}`}>{l}</li>)}
                            </ul>
                        </div>
                    </div>
                </section>

                {/* III. Key Projects */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">III. TIẾN ĐỘ MỘT SỐ DỰ ÁN TRỌNG ĐIỂM ({'>'}5 TỶ):</h2>
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

                {/* IV. Plans */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">IV. KẾ HOẠCH TIẾP THEO:</h2>
                    <ul className="list-disc pl-5 space-y-1 text-sm text-justify">
                        {nextPlans.map(t => (
                            <li key={t.id}>
                                {formatTaskWithProject(t)} (Hạn: {new Date(t.deadline).toLocaleDateString('vi-VN')})
                            </li>
                        ))}
                        {customPlans.split('\n').filter(line => line.trim()).map((line, i) => (
                            <li key={`custom-plan-${i}`}>{line}</li>
                        ))}
                    </ul>
                </section>

                {/* V. Proposals */}
                <section>
                    <h2 className="text-base font-bold uppercase mb-2">V. KKVM VÀ KIẾN NGHỊ, ĐỀ XUẤT:</h2>
                    {customProposals ? (
                        <ul className="list-disc pl-5 space-y-1 text-sm text-justify">
                            {customProposals.split('\n').map((line, i) => (
                                <li key={`prop-${i}`}>{line}</li>
                            ))}
                        </ul>
                    ) : (
                        <p className="text-sm italic text-slate-500 pl-5">N/A</p>
                    )}
                </section>

                {/* Closing */}
                <p className="text-sm text-justify mt-6 mb-2">
                    Trên đây là báo cáo của Viettel Hà Nội. Kính xin ý kiến định hướng, chỉ đạo để thực hiện.
                </p>
            </div>

            {/* Footer */}
            <div className="mt-8 flex justify-end px-10 text-center break-inside-avoid">
                <div>
                    <p className="font-bold uppercase text-sm">VIETTEL HÀ NỘI</p>
                    <div className="h-24"></div>
                    <p className="font-bold text-sm">Nguyễn Văn Dũng</p>
                </div>
            </div>
        </div>
    </div>
  );
};

export default ReportManager;
