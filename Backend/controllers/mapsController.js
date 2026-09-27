const { Client } = require("@googlemaps/google-maps-services-js");
const { PLACE_CATEGORIES } = require("../utils/placeCategories");
const client = new Client({});

// ฟังก์ชันคำนวณระยะทาง (Haversine Formula) เป็นเส้นตรง กิโลเมตร
function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // รัศมีโลกในหน่วยกิโลเมตร
  const dLat = (lat2 - lat1) * (Math.PI / 180);
  const dLon = (lon2 - lon1) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(lat1 * (Math.PI / 180)) * Math.cos(lat2 * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a)); 
  return R * c; 
}

exports.searchNearbyPlaces = async (req, res) => {
  // รับคำค้นหาจากหน้าเว็บ (เช่น "สปา ใกล้ฉัน") และพิกัดของผู้ใช้
  const { keyword, lat, lng, categoryId } = req.query;
  const category = categoryId ? PLACE_CATEGORIES[categoryId] : null;
  const hasCoordinates =
    lat !== undefined &&
    lng !== undefined &&
    Number.isFinite(Number(lat)) &&
    Number.isFinite(Number(lng));
  const userLat = hasCoordinates ? Number(lat) : null;
  const userLng = hasCoordinates ? Number(lng) : null;

  if (categoryId && !category) {
    return res.status(400).json({ message: "หมวดหมู่สถานที่ไม่ถูกต้อง" });
  }

  try {
    if (category && !hasCoordinates) {
      return res.status(400).json({ message: "ต้องอนุญาตตำแหน่งเพื่อค้นหาสถานที่ใกล้คุณ" });
    }

    if (category) {
      let results = [];
      if (category.googleType) {
        let response = await client.placesNearby({
          params: {
            location: { lat: userLat, lng: userLng },
            radius: 5000,
            type: category.googleType,
            language: "th",
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
          timeout: 4000,
        });
        results = response.data.results || [];

        if (results.length === 0) {
          response = await client.placesNearby({
            params: {
              location: { lat: userLat, lng: userLng },
              radius: 50000,
              type: category.googleType,
              language: "th",
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
            timeout: 4000,
          });
          results = response.data.results || [];
        }
      } else {
        let response = await client.textSearch({
          params: {
            query: category.query,
            location: `${userLat},${userLng}`,
            radius: 5000,
            language: "th",
            key: process.env.GOOGLE_MAPS_API_KEY,
          },
          timeout: 4000,
        });
        results = (response.data.results || []).filter((place) => {
          const placeLat = place.geometry?.location?.lat;
          const placeLng = place.geometry?.location?.lng;
          return placeLat != null && placeLng != null &&
            getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng) <= 5;
        });

        if (results.length === 0) {
          response = await client.textSearch({
            params: {
              query: category.query,
              location: `${userLat},${userLng}`,
              radius: 50000,
              language: "th",
              key: process.env.GOOGLE_MAPS_API_KEY,
            },
            timeout: 4000,
          });
          results = (response.data.results || []).filter((place) => {
            const placeLat = place.geometry?.location?.lat;
            const placeLng = place.geometry?.location?.lng;
            return placeLat != null && placeLng != null &&
              getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng) <= 50;
          });
        }
      }

      req.query.keyword = category.query;
      return addDistancesAndRespond(results, userLat, userLng, res);
    }

    const searchParams = {
      query: keyword,
      language: 'th',
      key: process.env.GOOGLE_MAPS_API_KEY,
      ...(hasCoordinates ? { location: `${userLat},${userLng}`, radius: 5000 } : {}),
    };

    // 1. ค้นหาในระยะ 5000 เมตร (5 กิโลเมตร) ก่อน
    let response = await client.textSearch({
      params: searchParams,
      timeout: 2000,
    });

    let results = response.data.results;

    // Text Search ใช้ radius เป็นเพียง bias จึงกรองระยะจริงเพื่อให้ผลใกล้ผู้ใช้ก่อน
    if (hasCoordinates) {
      results = results.filter((place) => {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        return placeLat != null && placeLng != null &&
          getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng) <= 5;
      });
    }

    // 2. หากไม่มีสถานที่ภายใน 5 กม. ให้ขยายการค้นหาได้ถึง 50 กม.
    if (results.length === 0 && hasCoordinates) {
      response = await client.textSearch({
        params: {
          query: keyword,
          location: `${userLat},${userLng}`,
          radius: 50000, 
          language: 'th', 
          key: process.env.GOOGLE_MAPS_API_KEY, 
        },
        timeout: 2000,
      });
      results = response.data.results.filter((place) => {
        const placeLat = place.geometry?.location?.lat;
        const placeLng = place.geometry?.location?.lng;
        return placeLat != null && placeLng != null &&
          getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng) <= 50;
      });
    }

    // 3. ถ้ามีพิกัด user ให้ทำการคำนวณระยะทางขับรถตามถนนจริงด้วย Google Distance Matrix API
    if (hasCoordinates && results.length > 0) {
        const destinations = results
          .map(place => {
            const pLat = place.geometry?.location?.lat;
            const pLng = place.geometry?.location?.lng;
            return pLat != null && pLng != null ? `${pLat},${pLng}` : null;
          })
          .filter(Boolean);

        let distanceMap = new Map();

        if (destinations.length > 0) {
          try {
            const matrixRes = await client.distancematrix({
              params: {
                origins: [`${userLat},${userLng}`],
                destinations: destinations,
                mode: 'driving',
                language: 'th',
                key: process.env.GOOGLE_MAPS_API_KEY,
              },
              timeout: 4000,
            });

            const elements = matrixRes.data?.rows?.[0]?.elements;
            if (elements && elements.length > 0) {
              destinations.forEach((destKey, index) => {
                const elem = elements[index];
                if (elem && elem.status === 'OK') {
                  const meters = elem.distance?.value || 0;
                  const distKm = Math.round((meters / 1000) * 10) / 10;
                  distanceMap.set(destKey, {
                    distance_km: distKm,
                    distance_text: elem.distance?.text || `${distKm} กม.`,
                    duration_text: elem.duration?.text || null
                  });
                }
              });
            }
          } catch (matrixErr) {
            console.error("Distance Matrix API Error, fallback to Haversine:", matrixErr.response?.data?.error_message || matrixErr.message);
          }
        }

        results = results.map(place => {
          const pLat = place.geometry?.location?.lat;
          const pLng = place.geometry?.location?.lng;
          const destKey = pLat != null && pLng != null ? `${pLat},${pLng}` : null;

          if (destKey && distanceMap.has(destKey)) {
            const data = distanceMap.get(destKey);
            return {
              ...place,
              distance_km: data.distance_km,
              distance_text: data.distance_text,
              duration_text: data.duration_text
            };
          } else {
            // Fallback ใช้ Haversine กรณีคำนวณจาก Distance Matrix ไม่ได้
            let distance = 0;
            if (pLat != null && pLng != null) {
              distance = Math.round(getDistanceFromLatLonInKm(userLat, userLng, pLat, pLng) * 10) / 10;
            }
            return {
              ...place,
              distance_km: distance,
              distance_text: `ประมาณ ${distance} กม. (เส้นตรง)`,
              duration_text: null
            };
          }
        });

        // เรียงลำดับตามระยะทางขับรถจริง (จากใกล้สุดไปไกลสุด)
        results.sort((a, b) => a.distance_km - b.distance_km);
    }

    // ส่งข้อมูลสถานที่ที่ผ่านการเรียงลำดับกลับไปให้หน้า React
    res.status(200).json(results);
  } catch (error) {
    console.error("Google Maps API Error:", error.response?.data?.error_message || error.message);
    res.status(500).json({ message: "ไม่สามารถเชื่อมต่อ Google Maps ได้" });
  }
};

async function addDistancesAndRespond(results, userLat, userLng, res) {
  if (results.length === 0) return res.status(200).json([]);

  const destinations = results
    .map((place) => {
      const placeLat = place.geometry?.location?.lat;
      const placeLng = place.geometry?.location?.lng;
      return placeLat != null && placeLng != null ? `${placeLat},${placeLng}` : null;
    })
    .filter(Boolean);
  const distanceMap = new Map();

  if (destinations.length > 0) {
    try {
      const matrixRes = await client.distancematrix({
        params: {
          origins: [`${userLat},${userLng}`],
          destinations,
          mode: "driving",
          language: "th",
          key: process.env.GOOGLE_MAPS_API_KEY,
        },
        timeout: 4000,
      });
      const elements = matrixRes.data?.rows?.[0]?.elements;
      destinations.forEach((destination, index) => {
        const element = elements?.[index];
        if (element?.status === "OK") {
          const distanceKm = Math.round(((element.distance?.value || 0) / 1000) * 10) / 10;
          distanceMap.set(destination, {
            distance_km: distanceKm,
            distance_text: element.distance?.text || `${distanceKm} กม.`,
            duration_text: element.duration?.text || null,
          });
        }
      });
    } catch (error) {
      console.error("Distance Matrix API Error:", error.response?.data?.error_message || error.message);
    }
  }

  const places = results.map((place) => {
    const placeLat = place.geometry?.location?.lat;
    const placeLng = place.geometry?.location?.lng;
    const destination = placeLat != null && placeLng != null ? `${placeLat},${placeLng}` : null;
    const distance = destination && distanceMap.get(destination);
    if (distance) return { ...place, ...distance };

    const distanceKm = placeLat != null && placeLng != null
      ? Math.round(getDistanceFromLatLonInKm(userLat, userLng, placeLat, placeLng) * 10) / 10
      : null;
    return {
      ...place,
      ...(distanceKm != null ? {
        distance_km: distanceKm,
        distance_text: `ประมาณ ${distanceKm} กม. (เส้นตรง)`,
      } : {}),
      duration_text: null,
    };
  }).sort((a, b) => (a.distance_km ?? Infinity) - (b.distance_km ?? Infinity));

  return res.status(200).json(places);
}

// เพิ่มฟังก์ชันนี้ต่อท้ายไฟล์ controllers/mapsController.js
exports.getPlaceDetails = async (req, res) => {
  const { place_id } = req.params;
  
  try {
    const response = await client.placeDetails({
      params: {
        place_id: place_id,
        language: 'th',
        // เลือกดึงเฉพาะข้อมูลที่จำเป็นเพื่อประหยัดเงิน (รีวิว, รูปภาพ, เบอร์โทร, เวลาเปิดปิด)
        fields: ['name', 'formatted_address', 'formatted_phone_number', 'opening_hours', 'rating', 'user_ratings_total', 'reviews', 'photos', 'url', 'geometry'],
        key: process.env.GOOGLE_MAPS_API_KEY,
      },
      timeout: 3000,
    });

    const placeDetails = response.data.result;

    // แนบ URL สำหรับดึงรูปภาพไปด้วย เพื่อให้ Frontend นำไปแสดงผลได้ทันที
    if (placeDetails && placeDetails.photos) {
      placeDetails.photos = placeDetails.photos.map(photo => ({
        ...photo,
        photo_url: `https://maps.googleapis.com/maps/api/place/photo?maxwidth=800&photoreference=${photo.photo_reference}&key=${process.env.GOOGLE_MAPS_API_KEY}`
      }));
    }

    res.status(200).json(placeDetails);
  } catch (error) {
    console.error("Place Details Error:", error);
    res.status(500).json({ message: "ไม่สามารถดึงข้อมูลรายละเอียดได้" });
  }
};
