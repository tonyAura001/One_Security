import { formatMontant, formatDate } from '@/aurantir-front-kit/lib/utils'

function isFourn(type: string) {
  return type === 'facture_fournisseur' || type === 'avoir_fournisseur'
}

export async function downloadFacturePDF(id: string): Promise<void> {
  const response = await fetch('/api/pdf', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ type: 'facture', id }),
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
  const titre = isFourn(data.type) ? 'FACTURE FOURN.' : data.type.startsWith('avoir') ? 'AVOIR' : 'FACTURE'
  doc.text(titre, W - M, 25, { align: 'right' })
  doc.setFontSize(11)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(80, 80, 80)
  doc.text(data.numero, W - M, 32, { align: 'right' })
  doc.text(`Émise le ${formatDate(data.date_emission)}`, W - M, 38, { align: 'right' })
  doc.text(`Échéance : ${formatDate(data.date_echeance)}`, W - M, 44, { align: 'right' })

  // Tiers
  doc.setFontSize(9)
  doc.setTextColor(120, 120, 120)
  doc.text(isFourn(data.type) ? 'FOURNISSEUR' : 'FACTURÉ À', M, 55)
  doc.setFontSize(11)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(30, 30, 30)
  const tiersNom = isFourn(data.type)
    ? data.fournisseur?.nom || '—'
    : data.client?.nom_entreprise || '—'
  doc.text(tiersNom, M, 61)
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.setTextColor(80, 80, 80)
  const tiersAdresse = isFourn(data.type) ? data.fournisseur?.adresse : data.client?.adresse
  if (tiersAdresse) doc.text(tiersAdresse, M, 67)

  // Séparateur
  doc.setDrawColor(230, 230, 230)
  doc.line(M, 78, W - M, 78)

  // En-têtes colonnes
  const colX = [M, 85, 120, 145, 170]
  doc.setFontSize(8)
  doc.setFont('helvetica', 'bold')
  doc.setTextColor(100, 100, 100)
  doc.text('DÉSIGNATION', colX[0], 85)
  doc.text('P.U. HT', colX[1], 85, { align: 'right' })
  doc.text('QTÉ', colX[2], 85, { align: 'right' })
  doc.text('TVA', colX[3], 85, { align: 'right' })
  doc.text('TOTAL TTC', colX[4], 85, { align: 'right' })
  doc.line(M, 87, W - M, 87)

  // Lignes
  let y = 93
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
