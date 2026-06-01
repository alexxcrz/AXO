import { requestJson } from "../utils/utilidades.jsx";

async function retailMutation(path, payload) {
  return requestJson(`/warehouse/retail/${path}`, {
    method: "POST",
    body: JSON.stringify(payload || {}),
  });
}

export const retailApi = {
  upsertClient: (payload) => retailMutation("clients", payload),
  deleteClient: (payload) => retailMutation("clients/delete", payload),
  upsertSupplier: (payload) => retailMutation("suppliers", payload),
  upsertFootprint: (payload) => retailMutation("footprints", payload),
  upsertProduct: (payload) => retailMutation("products", payload),
  deleteProduct: (payload) => retailMutation("products/delete", payload),
  updateProductLot: (payload) => retailMutation("products/lot/update", payload),
  deleteProductLot: (payload) => retailMutation("products/lot/delete", payload),
  createPreassembledBox: (payload) => retailMutation("preassembled-boxes", payload),
  createPurchaseOrder: (payload) => retailMutation("purchase-orders", payload),
  pickPurchaseOrderLine: (payload) => retailMutation("purchase-orders/pick-line", payload),
  markPurchaseOrderPicked: (payload) => retailMutation("purchase-orders/mark-picked", payload),
  updateClosingChecklist: (payload) => retailMutation("purchase-orders/checklist", payload),
  approveClosing: (payload) => retailMutation("purchase-orders/approve-closing", payload),
  closePallet: (payload) => retailMutation("purchase-orders/close-pallet", payload),
  setOrderBoxes: (payload) => retailMutation("purchase-orders/boxes", payload),
  logLabelPrint: (payload) => retailMutation("labels/print-log", payload),
  createIncident: (payload) => retailMutation("incidents", payload),
  updateIncident: (payload) => retailMutation("incidents/update", payload),
  deleteIncident: (payload) => retailMutation("incidents/delete", payload),
};
