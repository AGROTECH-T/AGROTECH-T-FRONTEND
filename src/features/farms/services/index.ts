/**
 * Servicios del dominio de fincas.
 *
 * Propósito: reexportar el cliente y las etiquetas de rol.
 * @author Cristian Deysdayr Jimenez
 */

export {
  createFarm,
  deleteFarm,
  getFarm,
  listFarms,
  updateFarm,
} from "./farmsApi.ts";
export { roleLabel } from "./roleLabel.ts";
