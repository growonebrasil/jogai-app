import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";

interface PdfReportData {
  peladaName: string;
  periodLabel: string;
  totalInc: number;
  totalExp: number;
  finishedMatchesCount: number;
  membersCount: number;
  paidCount: number;
  unpaidCount: number;
  topScorer?: { name: string; goals: number } | null;
  topAssister?: { name: string; assists: number } | null;
  mostGames?: { name: string; matches: number } | null;
  mostCards?: { name: string; yellow_cards: number; red_cards: number } | null;
  expenses: { category: string; description?: string | null; amount: number }[];
  payments: { name: string; status: string; amount: number; month: string }[];
}

export function generatePeladaPdf(data: PdfReportData) {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 15;

  // Background
  doc.setFillColor(18, 18, 18);
  doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F");

  // Header
  doc.setFillColor(15, 169, 88);
  doc.rect(0, 0, pageWidth, 40, "F");
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(22);
  doc.setFont("helvetica", "bold");
  doc.text("JOGA.I.", margin, 18);
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.text("Relatório de Pelada", margin, 26);
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.text(data.peladaName, margin, 35);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.text(`Período: ${data.periodLabel}`, pageWidth - margin, 35, { align: "right" });

  let y = 50;

  // Financial Summary
  doc.setFillColor(28, 28, 28);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 30, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 169, 88);
  doc.text("Resumo Financeiro", margin + 5, y + 8);

  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  const col = (pageWidth - margin * 2) / 3;
  doc.text(`Receitas: R$ ${data.totalInc.toFixed(2)}`, margin + 5, y + 17);
  doc.setTextColor(239, 68, 68);
  doc.text(`Despesas: R$ ${data.totalExp.toFixed(2)}`, margin + col + 5, y + 17);
  const saldo = data.totalInc - data.totalExp;
  doc.setTextColor(saldo >= 0 ? 15 : 239, saldo >= 0 ? 169 : 68, saldo >= 0 ? 88 : 68);
  doc.text(`Saldo: R$ ${saldo.toFixed(2)}`, margin + col * 2 + 5, y + 17);

  y += 38;

  // Activity Summary
  doc.setFillColor(28, 28, 28);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 22, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 169, 88);
  doc.text("Atividade", margin + 5, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  doc.text(`${data.finishedMatchesCount} partidas · ${data.membersCount} jogadores · ${data.paidCount} pagos · ${data.unpaidCount} pendentes`, margin + 5, y + 16);

  y += 30;

  // Performance Highlights
  doc.setFillColor(28, 28, 28);
  doc.roundedRect(margin, y, pageWidth - margin * 2, 32, 3, 3, "F");
  doc.setFontSize(11);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(15, 169, 88);
  doc.text("Destaques", margin + 5, y + 8);
  doc.setFontSize(9);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(200, 200, 200);
  let hy = y + 16;
  if (data.topScorer && data.topScorer.goals > 0) {
    doc.text(`🏆 Artilheiro: ${data.topScorer.name} (${data.topScorer.goals} gols)`, margin + 5, hy);
    hy += 6;
  }
  if (data.topAssister && data.topAssister.assists > 0) {
    doc.text(`🤝 Garçom: ${data.topAssister.name} (${data.topAssister.assists} assist.)`, margin + 5, hy);
    hy += 6;
  }
  if (data.mostGames && data.mostGames.matches > 0) {
    doc.text(`📅 Mais presente: ${data.mostGames.name} (${data.mostGames.matches} jogos)`, margin + col + 5, y + 16);
  }

  y += 40;

  // Payments Table
  if (data.payments.length > 0) {
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 169, 88);
    doc.text("Status de Pagamento", margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Jogador", "Mês", "Valor", "Status"]],
      body: data.payments.map(p => [p.name, p.month, `R$ ${p.amount.toFixed(2)}`, p.status === "pago" ? "✅ Pago" : "❌ Pendente"]),
      styles: {
        fillColor: [28, 28, 28],
        textColor: [200, 200, 200],
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [15, 169, 88],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [35, 35, 35] },
    });

    y = (doc as any).lastAutoTable.finalY + 10;
  }

  // Expenses Table
  if (data.expenses.length > 0) {
    if (y > 240) { doc.addPage(); y = 20; doc.setFillColor(18, 18, 18); doc.rect(0, 0, pageWidth, doc.internal.pageSize.getHeight(), "F"); }

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(15, 169, 88);
    doc.text("Despesas", margin, y);
    y += 5;

    autoTable(doc, {
      startY: y,
      margin: { left: margin, right: margin },
      head: [["Categoria", "Descrição", "Valor"]],
      body: data.expenses.slice(0, 15).map(e => [e.category, e.description || "—", `R$ ${e.amount.toFixed(2)}`]),
      styles: {
        fillColor: [28, 28, 28],
        textColor: [200, 200, 200],
        fontSize: 8,
        cellPadding: 3,
      },
      headStyles: {
        fillColor: [239, 68, 68],
        textColor: [255, 255, 255],
        fontStyle: "bold",
      },
      alternateRowStyles: { fillColor: [35, 35, 35] },
    });
  }

  // Footer
  const totalPages = doc.getNumberOfPages();
  for (let i = 1; i <= totalPages; i++) {
    doc.setPage(i);
    doc.setFontSize(7);
    doc.setTextColor(100, 100, 100);
    doc.text(`JOGA.I. — Gerado em ${new Date().toLocaleDateString("pt-BR")}`, margin, doc.internal.pageSize.getHeight() - 8);
    doc.text(`Página ${i}/${totalPages}`, pageWidth - margin, doc.internal.pageSize.getHeight() - 8, { align: "right" });
  }

  doc.save(`relatorio_${data.peladaName.replace(/\s/g, "_")}.pdf`);
}
