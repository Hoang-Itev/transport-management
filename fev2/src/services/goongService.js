// src/services/goongService.js
import axios from 'axios';

// Không dùng axiosClient vì đây là gọi ra domain bên ngoài (Goong), không phải server nội bộ
const GOONG_API_KEY = import.meta.env.VITE_GOONG_API_KEY || 'KEY_CUA_BAN_NEU_CHUA_DUNG_ENV';

export const goongService = {
  // 1. Gợi ý địa chỉ Autocomplete
  searchPlaces: async (input) => {
    const url = `https://rsapi.goong.io/Place/AutoComplete?api_key=${GOONG_API_KEY}&input=${encodeURIComponent(input)}`;
    const response = await axios.get(url);
    return response.data;
  },

  // 2. Lấy chi tiết một địa điểm
  getPlaceDetail: async (placeId) => {
    const url = `https://rsapi.goong.io/Place/Detail?api_key=${GOONG_API_KEY}&place_id=${placeId}`;
    const response = await axios.get(url);
    return response.data;
  },

  // 3. Đo khoảng cách Km (Dùng cho Bao xe FTL)
  getDistance: async (origins, destinations) => {
    const url = `https://rsapi.goong.io/DistanceMatrix?api_key=${GOONG_API_KEY}&origins=${origins}&destinations=${destinations}&vehicle=truck`;
    const response = await axios.get(url);
    return response.data;
  }
};