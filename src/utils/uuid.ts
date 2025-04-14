
import { v4 as uuidv4 } from "uuid";

/**
 * Checks if a string is a valid UUID
 * If not, retrieves a mapped UUID or creates a new one
 */
export const getValidUuid = (id: string): string => {
  if (id && id.match(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i)) {
    return id;
  }
  
  // Check if we have a stored mapping
  const idMappings = JSON.parse(localStorage.getItem('id_mappings') || '{}');
  if (idMappings[id]) {
    return idMappings[id];
  }
  
  // Generate a new UUID if needed
  const newUuid = uuidv4();
  idMappings[id] = newUuid;
  localStorage.setItem('id_mappings', JSON.stringify(idMappings));
  return newUuid;
};
