import { db, storage } from "../firebase/config";
import { 
  collection, 
  addDoc, 
  updateDoc, 
  doc, 
  getDoc, 
  query, 
  where, 
  getDocs,
  serverTimestamp 
} from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

const DELIVERIES_COLLECTION = "shipments";

export const createDelivery = async (deliveryData) => {
  try {
    const docRef = await addDoc(collection(db, DELIVERIES_COLLECTION), {
      ...deliveryData,
      status: "PENDING",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    return { id: docRef.id, error: null };
  } catch (error) {
    return { id: null, error: error.message };
  }
};

export const getDelivery = async (deliveryId) => {
  try {
    const docRef = doc(db, DELIVERIES_COLLECTION, deliveryId);
    const docSnap = await getDoc(docRef);
    if (docSnap.exists()) {
      return { data: { id: docSnap.id, ...docSnap.data() }, error: null };
    } else {
      return { data: null, error: "Delivery not found" };
    }
  } catch (error) {
    return { data: null, error: error.message };
  }
};

export const updateDeliveryStatus = async (deliveryId, status, additionalData = {}) => {
  try {
    const docRef = doc(db, DELIVERIES_COLLECTION, deliveryId);
    await updateDoc(docRef, {
      ...additionalData,
      status,
      updatedAt: serverTimestamp(),
    });
    return { error: null };
  } catch (error) {
    return { error: error.message };
  }
};

export const uploadDeliveryPhoto = async (deliveryId, uri) => {
  try {
    const response = await fetch(uri);
    const blob = await response.blob();
    // Use a more structured path: deliveries/{shipmentId}/proof.jpg
    const storageRef = ref(storage, `deliveries/${deliveryId}/proof.jpg`);
    await uploadBytes(storageRef, blob);
    const downloadURL = await getDownloadURL(storageRef);
    return { url: downloadURL, error: null };
  } catch (error) {
    return { url: null, error: error.message };
  }
};
