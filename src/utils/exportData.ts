import { format } from 'date-fns';

interface Job {
  id: string;
  company: string;
  role: string;
  source: string;
  status: string;
  date: string;
  updatedAt: string;
  salary: string;
  link: string;
  skills: string[];
  contacts: any[];
  notes: string;
}

interface KPIs {
  total: number;
  interviews: number;
  rate: string;
  offers: number;
}

// CSV Export
export const exportToCSV = (jobs: Job[]) => {
  const headers = ['Company', 'Role', 'Status', 'Date Applied', 'Updated', 'Salary', 'Source', 'Skills', 'Contacts', 'Notes'];
  
  const rows = jobs.map(job => [
    job.company,
    job.role,
    job.status,
    format(new Date(job.date), 'MMM dd, yyyy'),
    format(new Date(job.updatedAt), 'MMM dd, yyyy'),
    job.salary,
    job.source,
    job.skills.join('; '),
    job.contacts.map(c => c.name).join('; '),
    job.notes.replace(/"/g, '""'), // Escape quotes
  ]);

  const csvContent = [
    [headers.join(',')],
    ...rows.map(row => row.map(cell => {
      const cellStr = String(cell);
      return cellStr.includes(',') || cellStr.includes('"') ? `"${cellStr}"` : cellStr;
    }).join(','))
  ].join('\n');

  downloadFile(csvContent, `job-applications-${format(new Date(), 'yyyy-MM-dd')}.csv`, 'text/csv');
};

// Excel Export
export const exportToExcel = async (jobs: Job[], kpis: KPIs) => {
  try {
    const XLSX = await import('xlsx');
    const workbook = XLSX.utils.book_new();

    // Jobs Sheet
    const jobsData = jobs.map(job => ({
      'Company': job.company,
      'Role': job.role,
      'Status': job.status,
      'Date Applied': format(new Date(job.date), 'MMM dd, yyyy'),
      'Last Updated': format(new Date(job.updatedAt), 'MMM dd, yyyy'),
      'Salary': job.salary,
      'Source': job.source,
      'Skills': job.skills.join('; '),
      'Contacts': job.contacts.map(c => c.name).join('; '),
      'Notes': job.notes,
    }));

    const jobsSheet = XLSX.utils.json_to_sheet(jobsData);
    XLSX.utils.book_append_sheet(workbook, jobsSheet, 'Applications');

    // Analytics Sheet
    const analyticsData = [
      ['Metric', 'Value'],
      ['Total Applications', kpis.total],
      ['In-Cycle Interviews', kpis.interviews],
      ['Success Rate', kpis.rate],
      ['Offers Secured', kpis.offers],
      ['', ''],
      ['Status Breakdown', 'Count'],
      ...jobs.reduce((acc, job) => {
        const existing = acc.find((item: any) => item[0] === job.status);
        if (existing) {
          existing[1] += 1;
        } else {
          acc.push([job.status, 1]);
        }
        return acc;
      }, [] as any[]),
    ];

    const analyticsSheet = XLSX.utils.aoa_to_sheet(analyticsData);
    XLSX.utils.book_append_sheet(workbook, analyticsSheet, 'Analytics');

    XLSX.writeFile(workbook, `job-analytics-${format(new Date(), 'yyyy-MM-dd')}.xlsx`);
  } catch (error) {
    console.error('Error exporting to Excel:', error);
    alert('Failed to export Excel file. Make sure xlsx is installed.');
  }
};

// PDF Export
export const exportToPDF = async (jobs: Job[], kpis: KPIs) => {
  try {
    const html2pdf = await import('html2pdf.js');
    
    const element = document.createElement('div');
    element.style.padding = '20px';
    element.style.fontFamily = 'Arial, sans-serif';
    element.style.lineHeight = '1.6';
    element.style.color = '#333';

    // Title
    const title = document.createElement('h1');
    title.textContent = 'Job Application Analytics Report';
    title.style.fontSize = '24px';
    title.style.marginBottom = '10px';
    element.appendChild(title);

    // Date
    const dateStr = document.createElement('p');
    dateStr.textContent = `Generated on ${format(new Date(), 'MMMM dd, yyyy')}`;
    dateStr.style.color = '#666';
    dateStr.style.marginBottom = '30px';
    element.appendChild(dateStr);

    // KPIs
    const kpiSection = document.createElement('div');
    kpiSection.style.marginBottom = '30px';
    kpiSection.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 15px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">Key Performance Indicators</h2>
      <table style="width: 100%; border-collapse: collapse;">
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Total Applications</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${kpis.total}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">In-Cycle Interviews</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${kpis.interviews}</td>
        </tr>
        <tr style="background-color: #f3f4f6;">
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Success Rate</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${kpis.rate}</td>
        </tr>
        <tr>
          <td style="padding: 10px; border: 1px solid #e5e7eb; font-weight: bold;">Offers Secured</td>
          <td style="padding: 10px; border: 1px solid #e5e7eb;">${kpis.offers}</td>
        </tr>
      </table>
    `;
    element.appendChild(kpiSection);

    // Jobs Table
    const jobsSection = document.createElement('div');
    jobsSection.style.pageBreakBefore = 'always';
    jobsSection.innerHTML = `
      <h2 style="font-size: 18px; margin-bottom: 15px; margin-top: 30px; border-bottom: 2px solid #6366f1; padding-bottom: 10px;">Application Details</h2>
      <table style="width: 100%; border-collapse: collapse; font-size: 12px;">
        <thead>
          <tr style="background-color: #1f2937; color: white;">
            <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Company</th>
            <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Role</th>
            <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Status</th>
            <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Applied</th>
            <th style="padding: 8px; border: 1px solid #d1d5db; text-align: left;">Salary</th>
          </tr>
        </thead>
        <tbody>
          ${jobs.map((job, idx) => `
            <tr style="background-color: ${idx % 2 === 0 ? '#ffffff' : '#f9fafb'};">
              <td style="padding: 8px; border: 1px solid #d1d5db;">${job.company}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${job.role}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db; font-weight: bold;">${job.status}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${format(new Date(job.date), 'MMM dd')}</td>
              <td style="padding: 8px; border: 1px solid #d1d5db;">${job.salary}</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
    element.appendChild(jobsSection);

    const opt = {
      margin: 10,
      filename: `job-applications-${format(new Date(), 'yyyy-MM-dd')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2 },
      jsPDF: { orientation: 'portrait', unit: 'mm', format: 'a4' }
    };

    html2pdf.default().set(opt).from(element).save();
  } catch (error) {
    console.error('Error exporting to PDF:', error);
    alert('Failed to export PDF. Make sure html2pdf is installed.');
  }
};

// Helper function to download files
const downloadFile = (content: string, filename: string, mimeType: string) => {
  const blob = new Blob([content], { type: mimeType });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  window.URL.revokeObjectURL(url);
};
