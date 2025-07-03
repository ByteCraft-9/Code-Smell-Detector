import { jsPDF } from 'jspdf';
import { AnalysisResult, AnalysisStats, CodeSmell, CodeSmellType } from '../types';

export class PDFReportGenerator {
  private doc: jsPDF;
  private currentY: number = 20;
  private pageWidth: number = 210;
  private margin: number = 20;
  private lineHeight: number = 7;
  private rowCount: number = 0;
  private chartColors = [
    '#4338CA', // Indigo
    '#0F766E', // Teal
    '#C2410C', // Orange
    '#15803D', // Green
    '#B45309', // Amber
    '#B91C1C', // Red
    '#6366F1', // Light Indigo
    '#047857', // Emerald
    '#EA580C', // Orange
    '#0369A1'  // Blue
  ];
  private colors = {
    primary: '#578FCA',    // Bright Blue
    secondary: '#6366f1',  // Indigo
    accent: '#8b5cf6',     // Purple
    success: '#22c55e',    // Green
    warning: '#f59e0b',    // Orange
    error: '#ef4444',      // Red
    text: '#1e293b',       // Dark slate
    lightBg: '#f8fafc',    // Light background
    gradientStart: '#578FCA',
    gradientEnd: '#8b5cf6',
    headerBg: '#578FCA',
    headerText: '#ffffff'
  };

  constructor() {
    this.doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });
    this.doc.setFont('helvetica');
  }

  private drawHeader() {
    // Draw header background
    this.doc.setFillColor(this.colors.headerBg);
    this.doc.rect(0, 0, this.pageWidth, 30, 'F');

    // Add title
    this.doc.setTextColor(this.colors.headerText);
    this.doc.setFontSize(24);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text('Code Analysis Report', this.margin, 22);

    // Add timestamp
    this.doc.setFontSize(10);
    this.doc.setFont('helvetica', 'normal');
    const timestamp = new Date().toLocaleString();
    this.doc.text(`Generated on: ${timestamp}`, this.margin, 28);

    this.currentY = 40;
  }

  private drawRect(x: number, y: number, width: number, height: number, color: string) {
    this.doc.setFillColor(color);
    this.doc.rect(x, y - height + 2, width, height, 'F');
  }

  private addSpace(points: number) {
    this.currentY += points;
  }

  private addHeading(text: string, size: number) {
    this.doc.setFontSize(size);
    this.doc.setTextColor(this.colors.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += size / 2;
  }

  private addText(text: string, spacing: number = 0) {
    this.doc.text(text, this.margin, this.currentY);
    this.currentY += this.lineHeight + spacing;
  }

  private async createMetricCard(value: number, maxValue: number, title: string, icon: string): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 300;
    canvas.height = 160;
    const ctx = canvas.getContext('2d')!;

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Card shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.1)';
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 4;
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(10, 10, canvas.width - 20, canvas.height - 20);
    ctx.shadowColor = 'transparent';

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const radius = 45;

    // Draw progress circle
    const percentage = Math.min(value / maxValue, 1);
    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + (2 * Math.PI * percentage);

    // Background circle
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
    ctx.lineWidth = 10;
    ctx.strokeStyle = '#f1f5f9';
    ctx.stroke();

    // Progress arc
    ctx.beginPath();
    ctx.arc(centerX, centerY, radius, startAngle, endAngle);
    ctx.lineWidth = 10;
    const gradient = ctx.createLinearGradient(centerX - radius, centerY, centerX + radius, centerY);
    gradient.addColorStop(0, this.colors.gradientStart);
    gradient.addColorStop(1, this.colors.gradientEnd);
    ctx.strokeStyle = gradient;
    ctx.lineCap = 'round';
    ctx.stroke();

    // Value text
    ctx.font = 'bold 24px Arial';
    ctx.fillStyle = this.colors.text;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(value.toString(), centerX, centerY);

    // Title
    ctx.font = 'bold 14px Arial';
    ctx.fillStyle = this.colors.primary;
    ctx.fillText(title, centerX, centerY + radius + 25);

    // Max value indicator
    ctx.font = '12px Arial';
    ctx.fillStyle = this.colors.secondary;
    ctx.fillText('Max: ' + maxValue, centerX, centerY + radius + 45);

    // Add visual indicator based on value
    const indicatorY = 20;
    const indicatorWidth = 80;
    const indicatorHeight = 4;
    ctx.fillStyle = '#f1f5f9';
    ctx.fillRect(centerX - indicatorWidth/2, indicatorY, indicatorWidth, indicatorHeight);
    
    const healthColor = percentage < 0.5 ? this.colors.success :
                       percentage < 0.8 ? this.colors.warning :
                       this.colors.error;
    ctx.fillStyle = healthColor;
    ctx.fillRect(centerX - indicatorWidth/2, indicatorY, indicatorWidth * percentage, indicatorHeight);

    return canvas.toDataURL('image/png');
  }

  private async addMetricsDashboard(stats: AnalysisStats) {
    this.addHeading('Code Metrics Overview', 16);
    this.addSpace(10);

    // Create a formatted table for metrics
    const metrics = stats.averageMetrics;
    
    // Table headers
    this.doc.setFillColor(this.colors.lightBg);
    this.doc.rect(this.margin, this.currentY, 170, 10, 'F');
    this.doc.setTextColor(this.colors.primary);
    this.doc.setFont('helvetica', 'bold');
    this.doc.setFontSize(11);
    this.doc.text('Metric', this.margin + 5, this.currentY + 7);
    this.doc.text('Value', this.margin + 85, this.currentY + 7);
    this.doc.text('Status', this.margin + 125, this.currentY + 7);
    this.currentY += 12;

    // Table rows
    this.doc.setFont('helvetica', 'normal');
    this.doc.setTextColor(this.colors.text);
    this.doc.setFontSize(10);

    const addTableRow = (metric: string, value: number, threshold: number, isHigherBetter: boolean = false) => {
      const status = isHigherBetter ? 
        (value >= threshold ? 'Good' : 'Needs Improvement') :
        (value <= threshold ? 'Good' : 'Needs Attention');
      const statusColor = status === 'Good' ? this.colors.success : this.colors.warning;

      // Add alternating background
      if ((this.rowCount % 2) === 0) {
        this.doc.setFillColor(245, 247, 250);
        this.doc.rect(this.margin, this.currentY - 2, 170, 8, 'F');
      }

      this.doc.text(metric, this.margin + 5, this.currentY + 4);
      this.doc.text(value.toFixed(2), this.margin + 85, this.currentY + 4);
      
      this.doc.setTextColor(statusColor);
      this.doc.text(status, this.margin + 125, this.currentY + 4);
      this.doc.setTextColor(this.colors.text);
      
      this.currentY += 8;
      this.rowCount++;
    };

    this.rowCount = 0;
    addTableRow('Cyclomatic Complexity', metrics.cyclomaticComplexity, 10);
    addTableRow('Method Count', metrics.methodCount, 15);
    addTableRow('Inheritance Depth', metrics.inheritanceDepth, 5);
    addTableRow('Coupling Count', metrics.couplingCount, 8);
    addTableRow('Cohesion Score', metrics.cohesionScore, 0.5, true);
    addTableRow('Lines of Code', metrics.linesOfCode, 300);

    this.addSpace(15);
  }

  private async createDonutChart(data: { label: string; value: number }[]): Promise<string> {
    const canvas = document.createElement('canvas');
    canvas.width = 500;  // Increased for better quality
    canvas.height = 400;
    const ctx = canvas.getContext('2d')!;

    // Clear background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;
    const outerRadius = Math.min(centerX, centerY) * 0.6;
    const innerRadius = outerRadius * 0.6;

    const total = data.reduce((sum, item) => sum + item.value, 0);
    let startAngle = -Math.PI / 2;

    // Draw donut segments
    data.forEach((item, index) => {
      const sliceAngle = (2 * Math.PI * item.value) / total;
      const endAngle = startAngle + sliceAngle;

      // Draw segment
      ctx.beginPath();
      ctx.arc(centerX, centerY, outerRadius, startAngle, endAngle);
      ctx.arc(centerX, centerY, innerRadius, endAngle, startAngle, true);
      ctx.closePath();

      ctx.fillStyle = this.chartColors[index % this.chartColors.length];
      ctx.fill();

      // Add labels with lines
      const midAngle = startAngle + sliceAngle / 2;
      const labelRadius = outerRadius + 30;
      
      // Calculate label position
      let labelX = centerX + Math.cos(midAngle) * labelRadius;
      const labelY = centerY + Math.sin(midAngle) * labelRadius;
      
      // Adjust label position based on side
      ctx.textAlign = labelX > centerX ? 'start' : 'end';
      if (labelX > centerX) {
        labelX += 10;
      } else {
        labelX -= 10;
      }

      // Draw connecting line
      const lineStartX = centerX + Math.cos(midAngle) * outerRadius;
      const lineStartY = centerY + Math.sin(midAngle) * outerRadius;
      const lineEndX = centerX + Math.cos(midAngle) * (labelRadius - 10);
      const lineEndY = centerY + Math.sin(midAngle) * (labelRadius - 10);
      
      ctx.beginPath();
      ctx.moveTo(lineStartX, lineStartY);
      ctx.lineTo(lineEndX, lineEndY);
      ctx.strokeStyle = this.colors.text;
      ctx.stroke();

      // Draw label
      ctx.fillStyle = this.colors.text;
      ctx.font = '12px Arial';
      ctx.textBaseline = 'middle';
      const label = `${item.label} (${item.value})`;
      ctx.fillText(label, labelX, labelY);

      startAngle = endAngle;
    });

    return canvas.toDataURL('image/png');
  }

  private async addSmellDistribution(stats: AnalysisStats) {
    this.addHeading('Code Smells Distribution', 16);
    this.addSpace(10);

    const smellData = Object.entries(stats.smellsByType)
      .map(([label, value]) => ({
        label: label.replace(/([A-Z])/g, ' $1').trim(),
        value: value as number
      }))
      .filter(item => item.value > 0);

    const chartImage = await this.createDonutChart(smellData);
    // Center align the chart
    const chartWidth = 160;
    const chartHeight = 120;
    const xPos = (this.pageWidth - chartWidth) / 2;
    
    this.doc.addImage(
      chartImage,
      'PNG',
      xPos,
      this.currentY,
      chartWidth,
      chartHeight
    );

    this.currentY += chartHeight + 10;
  }

  private async addSeverityDistribution(results: AnalysisResult[]) {
    this.addHeading('Issues by Severity', 16);
    this.addSpace(5);

    const severityDistribution = results.flatMap(r => r.smells).reduce((acc, smell) => {
      acc[smell.severity] = (acc[smell.severity] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);

    const severityData = Object.entries(severityDistribution)
      .map(([label, value]) => ({
        label: label.charAt(0).toUpperCase() + label.slice(1),
        value
      }))
      .filter(item => item.value > 0);

    const chartImage = await this.createDonutChart(severityData);
    // Center align and increase size
    const chartWidth = 140;
    const chartHeight = 105;
    const xPos = (this.pageWidth - chartWidth) / 2;
    
    this.doc.addImage(
      chartImage,
      'PNG',
      xPos,
      this.currentY,
      chartWidth,
      chartHeight
    );

    this.currentY += chartHeight + 5;
  }

  private checkPageBreak(requiredSpace: number) {
    const pageHeight = 297; // A4 height in mm
    const marginBottom = 20;
    
    if (this.currentY + requiredSpace > pageHeight - marginBottom) {
      this.doc.addPage();
      this.currentY = this.margin;
    }
  }

  private async addDetailedFindings(results: AnalysisResult[]) {
    this.addHeading('Detailed Findings', 16);
    this.addSpace(10);

    // Sort findings by severity
    const allSmells = results.flatMap(result => 
      result.smells.map(smell => ({
        ...smell,
        fileName: result.fileName
      }))
    ).sort((a, b) => {
      const severityOrder = { high: 0, medium: 1, low: 2 };
      return severityOrder[a.severity] - severityOrder[b.severity];
    });

    // Group by severity
    const severityGroups = {
      high: allSmells.filter(s => s.severity === 'high'),
      medium: allSmells.filter(s => s.severity === 'medium'),
      low: allSmells.filter(s => s.severity === 'low')
    };

    // Severity color mapping
    const severityColors = {
      high: this.colors.error,
      medium: this.colors.warning,
      low: this.colors.success
    };

    // Add findings by severity
    for (const [severity, smells] of Object.entries(severityGroups)) {
      if (smells.length === 0) continue;

      this.doc.setFontSize(14);
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(severityColors[severity as keyof typeof severityColors]);
      this.doc.text(
        `${severity.charAt(0).toUpperCase() + severity.slice(1)} Severity Issues (${smells.length})`,
        this.margin,
        this.currentY
      );
      this.currentY += 8;
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(this.colors.text);
      this.doc.setFontSize(10);

      smells.forEach((smell, index) => {
        // Check if we need a new page
        if (this.currentY > 270) {
          this.doc.addPage();
          this.currentY = this.margin;
        }

        // Add smell details
        this.doc.setFont('helvetica', 'bold');
        this.doc.text(`${index + 1}. ${smell.type}`, this.margin, this.currentY);
        this.currentY += 5;
        this.doc.setFont('helvetica', 'normal');
        
        // File location
        this.doc.text(`File: ${smell.fileName} (Line ${smell.lineNumber})`, this.margin + 5, this.currentY);
        this.currentY += 5;

        // Description
        const description = this.doc.splitTextToSize(
          smell.description,
          this.pageWidth - (2 * this.margin + 5)
        );
        description.forEach((line: string) => {
          if (this.currentY > 270) {
            this.doc.addPage();
            this.currentY = this.margin;
          }
          this.doc.text(line, this.margin + 5, this.currentY);
          this.currentY += 5;
        });

        // Refactoring tip
        if (smell.refactoringTip) {
          this.doc.setFont('helvetica', 'italic');
          const tip = this.doc.splitTextToSize(
            `Tip: ${smell.refactoringTip}`,
            this.pageWidth - (2 * this.margin + 5)
          );
          tip.forEach((line: string) => {
            if (this.currentY > 270) {
              this.doc.addPage();
              this.currentY = this.margin;
            }
            this.doc.text(line, this.margin + 5, this.currentY);
            this.currentY += 5;
          });
        }

        this.currentY += 5;
      });

      this.currentY += 10;
    }
  }

  public async generateReport(results: AnalysisResult[], stats: AnalysisStats): Promise<string> {
    // Draw header
    this.drawHeader();

    // Executive Summary with styled box
    this.addHeading('Executive Summary', 16);
    this.doc.setFillColor(this.colors.lightBg);
    this.doc.rect(this.margin - 2, this.currentY, 170, 20, 'F');
    this.addText(`This report analyzes ${stats.totalFiles} files and identifies ${stats.totalSmells} code quality issues.`);
    this.addSpace(15);

    // Add metrics dashboard
    await this.addMetricsDashboard(stats);

    // Force both charts on same page
    this.doc.addPage();
    this.currentY = this.margin;

    // Add both distribution charts on same page
    await this.addSeverityDistribution(results);
    await this.addSmellDistribution(stats);

    // Add detailed findings on next page
    this.doc.addPage();
    this.currentY = this.margin;
    await this.addDetailedFindings(results);

    // Add recommendations page
    this.doc.addPage();
    this.currentY = this.margin;
    this.addRecommendations();

    return this.doc.output('datauristring');
  }

  private addRecommendations() {
    this.addHeading('Recommendations', 16);
    this.addSpace(10);

    // Styled recommendation boxes
    const recommendations = [
      { 
        title: 'High Priority Issues',
        text: 'Address high-severity issues in the most affected files first. Focus on critical code smells that could impact system stability and maintainability.'
      },
      { 
        title: 'Code Complexity',
        text: 'Focus on reducing cyclomatic complexity in functions and classes. Consider breaking down complex methods into smaller, more manageable pieces.'
      },
      { 
        title: 'Code Structure',
        text: 'Review and refactor deeply nested code blocks. Improve code organization by following SOLID principles and design patterns.'
      },
      { 
        title: 'Code Duplication',
        text: 'Identify and consolidate duplicate code segments. Create reusable components and utilities to promote code reuse.'
      }
    ];

    recommendations.forEach((rec, index) => {
      // Check if we need a new page
      if (this.currentY > 250) {
        this.doc.addPage();
        this.currentY = this.margin;
      }

      // Draw recommendation box
      this.doc.setFillColor(this.colors.lightBg);
      this.doc.rect(this.margin - 2, this.currentY, 170, 25, 'F');
      this.doc.setFillColor(this.colors.primary);
      this.doc.rect(this.margin - 2, this.currentY, 4, 25, 'F');

      this.currentY += 5;
      
      // Add title
      this.doc.setFont('helvetica', 'bold');
      this.doc.setTextColor(this.colors.primary);
      this.doc.setFontSize(12);
      this.doc.text(rec.title, this.margin + 5, this.currentY);
      this.currentY += 5;

      // Add description
      this.doc.setFont('helvetica', 'normal');
      this.doc.setTextColor(this.colors.text);
      this.doc.setFontSize(10);
      const lines = this.doc.splitTextToSize(rec.text, 160);
      lines.forEach((line: string) => {
        this.doc.text(line, this.margin + 5, this.currentY);
        this.currentY += 5;
      });

      this.currentY += 5;
    });
  }
} 