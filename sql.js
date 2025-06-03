import { generatePDFAndSave } from "./src/lib/pdfUtil.js";  // .js extension zaruri hai
import path from "path";

async function test() {
  const photoPath = "C:\\Users\\Yash\\Desktop\\Trinetra\\trinetra\\public\\uploads\\sample1.jpg";
  const pdfPath = await generatePDFAndSave({
    candidateName: "Test User",
    houseNo: "101",
    area: "Test Area",
    city: "Ahmedabad",
    state: "Gujarat",
    zipCode: "380001",
    country: "India",
    submittedAt: new Date().toLocaleString(),
    staticMapUrl: "https://maps.gstatic.com/mapfiles/ms2/micons/blue-dot.png",
    addressCoords: { lat: 23.0436906, lng: 72.665431 },
    gpsLocation: { lat: 23.0436906, lng: 72.665431 },
    photo1: photoPath,
  }, "test-sample.pdf");
  console.log("PDF generated at:", pdfPath);
}

test();
