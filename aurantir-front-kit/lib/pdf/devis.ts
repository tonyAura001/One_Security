import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'

export async function downloadDevisPDF(id: string): Promise<void> {
  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'devis', id }),
  })
  if (!response.ok) {
    const err = await response.json().catch(() => ({}))
    throw new Error(err.error || `Erreur ${response.status}`)
  }
  const { data } = await response.json()
  if (!data) throw new Error('Données PDF introuvables')

  const { default: jsPDF } = await import('jspdf')
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W = 210; const M = 15

  // En-tête émetteur
  doc.setFontSize(18)
  doc.setFont('helvetica', 'bold')
  doc.text(data.entite?.nom || 'Sama Digital', M, 25)
  doc.setFontSize(9)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(120, 120, 120)
  if (data.entite?.adresse) doc.text(data.entite.adresse, M, 31)
  if (data.entite?.email_contact) doc.text(data.entite.email_contact, M, 36)

  // Titre + numéro
  doc.setFontSize(22)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text('DEVIS', W - M, 25, { align: 'right' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(data.numero, W - M, 32, { align: 'right' })
  doc.text(`Émis le ${formatDate(data.date_emission)}`, W - M, 38, { align: 'right' })
  if (data.date_validite) doc.text(`Valide jusqu'au ${formatDate(data.date_validite)}`, W - M, 44, { align: 'right' })

  // Tiers
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text('ADRESSÉ À', M, 55)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  doc.text(data.client?.nom_entreprise || '—', M, 61)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  if (data.client?.adresse) doc.text(data.client.adresse, M, 67)

  // Titre du devis
  if (data.titre) {
    doc.setFontSize(10)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(30, 30, 30)
    doc.text(String(data.titre), M, 78)
  }

  // Séparateur
  doc.setDrawColor(230, 230, 230)
  doc.line(M, 83, W - M, 83)

  // En-têtes colonnes
  const colX = [M, 85, 120, 145, 170]
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DÉSIGNATION', colX[0], 90)
  doc.text('P.U. HT', colX[1], 90, { align: 'right' })
  doc.text('QTÉ', colX[2], 90, { align: 'right' })
  doc.text('TVA', colX[3], 90, { align: 'right' })
  doc.text('TOTAL TTC', colX[4], 90, { align: 'right' })
  doc.line(M, 92, W - M, 92)

  // Lignes
  let y = 98
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(30, 30, 30)
  doc.setFontSize(9)
  for (const l of (data.lignes || [])) {
    doc.text(String(l.designation), colX[0], y)
    doc.text(formatMontant(l.prix_unitaire), colX[1], y, { align: 'right' })
    doc.text(String(l.quantite), colX[2], y, { align: 'right' })
    doc.text(`${l.taux_tva}%`, colX[3], y, { align: 'right' })
    doc.text(formatMontant(l.montant_ttc), colX[4], y, { align: 'right' })
    y += 7
  }

  // Totaux
  doc.line(M, y + 2, W - M, y + 2)
  y += 10
  const totalsX = 135
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  doc.text('Total HT', totalsX, y)
  doc.text(formatMontant(data.montant_ht), W - M, y, { align: 'right' })
  y += 6
  doc.text('TVA', totalsX, y)
  doc.text(formatMontant(data.montant_tva), W - M, y, { align: 'right' })
  y += 6
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(11)
  doc.setTextColor(30, 30, 30)
  doc.text('TOTAL TTC', totalsX, y)
  doc.text(formatMontant(data.montant_ttc), W - M, y, { align: 'right' })

  // Notes
  if (data.notes) {
    y += 16
    doc.setFontSize(8)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(120, 120, 120)
    doc.text('Notes :', M, y)
    doc.text(String(data.notes), M, y + 5)
  }

  doc.save(`${data.numero}.pdf`)
}
