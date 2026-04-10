import { useEffect, useState } from "react";
import axios from "axios";
import product_icon from "../assets/product-17.png";
import Modal from "../components/ModalQC";
import { useAuth } from "../context/AuthContext";

export interface Product {
  product_code: string;
  product_name: string;
  product_image_url: string | null;
  lot_priority: string | null;
  product_floor: string | null;
  product_addr: string | null;
  product_barcode: string | null;
  product_barcode2: string | null;
  product_barcode3: string | null;
  lot_priority_amount: number | null;
}

interface Image {
  procode: string;
  pro_imgmain: string | null;
  pro_img2: string | null;
  pro_img3: string | null;
  pro_img4: string | null;
  pro_img5: string | null;
}

interface OldSystemImage {
  product_old_img_id: number;
  product_code: string;
  old_img_url: string;
}

interface OldSystemResponse {
  imagesOldSystem: OldSystemImage[];
  imageOrderPicking: {
    mainImage: string;
    additionalImages: {
      product_att_id: number;
      product_code: string;
      product_img_url: string;
      created_at: string;
    }[];
  };
}

const ProductManage = () => {
  const [isSelect, setIsSelect] = useState<number>(1);
  const [productList, setProductList] = useState<Product[] | null>(null);
  const [limit] = useState<number>(18);
  const [offset, setOffset] = useState<number>(0);
  const [modalManageOpen, setModalManageOpen] = useState<boolean>(false);
  const [productManage, setProductManage] = useState<Product | null>(null);
  const [, setErrMsg] = useState<string | null>(null);
  // States สำหรับ upload improvements
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [changeFloor, setChangeFloor] = useState<string | null>(null);
  const [changeAddr, setChangeAddr] = useState<string | null>(null);
  const [changeLot, setChangeLot] = useState<string | null>(null);
  const [changeAmount, setChangeLotAmount] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | undefined>(undefined);
  const [previewImageOther, setPreviewImageOther] = useState<string[] | null>(null);
  const [selectedImagesOther, setSelectedImagesOther] = useState<File[]>([]);
  const { userInfo } = useAuth();
  const [barcode, setBarcode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);
  const [imgEcom, setImgEcom] = useState<Image | null>(null);
  const [imgOldSystem, setImgOldSystem] = useState<OldSystemResponse | null>(null);
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(true);
  const [uploadEcomImage, setUploadEcomImage] = useState<boolean>(false);
  const [uploadOldSystemImage, setUploadOldSystemImage] = useState<boolean>(false);
  const [editMode, setEditMode] = useState<boolean>(false);

  // Helper functions สำหรับจัดการรูปภาพ
  const validateFile = (file: File): string | null => {
    const maxMainImageSize = 10 * 1024 * 1024; // 10MB สำหรับรูปหลัก
    const acceptedTypes = ['image/jpeg', 'image/png', 'image/webp', 'image/jpg'];

    if (!acceptedTypes.includes(file.type)) {
      return `ประเภทไฟล์ไม่รองรับ (รองรับเฉพาะ ${acceptedTypes.map(t => t.split('/')[1]).join(', ')})`;
    }

    if (file.size > maxMainImageSize) {
      return `ไฟล์ใหญ่เกินไป (สูงสุด ${maxMainImageSize / (1024 * 1024)}MB)`;
    }

    return null;
  };

  const cleanupPreviewUrl = (url: string | null) => {
    if (url && url.startsWith('blob:')) {
      URL.revokeObjectURL(url);
    }
  };

  const showError = (error: string) => {
    setUploadErrors(prev => [...prev, error]);
    setTimeout(() => {
      setUploadErrors(prev => prev.filter(e => e !== error));
    }, 5000);
  };

  const handleFileSelect = (file: File, index: number | null) => {
    const validationError = validateFile(file);
    if (validationError) {
      showError(validationError);
      return;
    }

    if (index !== null) {
      // สำหรับรูปเพิ่มเติม
      setSelectedImagesOther((prev) => {
        const newFiles = [...prev];
        // ล้าง preview URL เก่า
        if (previewImageOther && previewImageOther[index]) {
          cleanupPreviewUrl(previewImageOther[index]);
        }
        newFiles[index] = file;
        return newFiles;
      });
      setPreviewImageOther((prev) => {
        const newPreview = [...prev || []];
        newPreview[index] = URL.createObjectURL(file);
        return newPreview;
      });
    } else {
      // สำหรับรูปหลัก
      if (previewImage && previewImage.startsWith('blob:')) {
        cleanupPreviewUrl(previewImage);
      }
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleGetList = async () => {
    setLoading(true);
    try {
      if (isSelect === 2) {
        const data = await axios.post(
          `${import.meta.env.VITE_API_URL_ORDER}/api/manage/get-product`,
          {
            limit: limit,
            offset: offset,
            type: "lot",
          }
        );
        setProductList(data.data);
      }
      if (isSelect === 1) {
        const data = await axios.post(
          `${import.meta.env.VITE_API_URL_ORDER}/api/manage/get-product`,
          {
            limit: limit,
            offset: offset,
            type: "none",
          }
        );
        setProductList(data.data);
      }
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    handleGetList();
  }, []);

  useEffect(() => {
    handleGetList();
  }, [isSelect, offset]);

  useEffect(() => {
    console.log(productList);
  }, [productList]);

  useEffect(() => {
    if (!barcode) {
      handleGetList();
      return;
    }

    const timeoutId = setTimeout(() => {
      handleSearchProductList(barcode);
    }, 1000);

    return () => clearTimeout(timeoutId);
  }, [barcode]);

  const handleSearchProductList = async (searchBarcode: string) => {
    setLoading(true);
    try {
      const data = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/manage/get-product-detail-manage`,
        { barcode: searchBarcode }
      );
      if (data.data) {
        // ตรวจสอบว่าถ้าข้อมูลเป็น Array อยู่แล้วให้ใช้ได้เลย แต่ถ้าเป็น Object ค่อยครอบด้วย []
        setProductList(Array.isArray(data.data) ? data.data : [data.data]);
      } else {
        setProductList([]);
        setErrMsg("ไม่พบสินค้า หรือ มีบางอย่างผิดพลาด");
      }
    } catch {
      setProductList([]);
      setErrMsg("ไม่พบ Barcode สินค้า");
    } finally {
      setLoading(false);
    }
  };

  const handleGetProductDetail = async (barcode: string | null) => {
    if (barcode) {
      console.log(barcode);
      const data = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER
        }/api/manage/get-product-detail-manage`,
        {
          barcode,
        }
      );
      console.log("data : ", data.data);
      if (data.data) {
        // รองรับกรณี API ส่งคืนค่ามาเป็น Array ให้หยิบรายการแรกมาแสดง
        setProductManage(Array.isArray(data.data) ? data.data[0] : data.data);
      } else {
        setErrMsg("ไม่พบสินค้า หรือ มีบางอย่างผิดพลาด");
      }
    } else {
      setErrMsg("ไม่พบ Barcode สินค้า");
      return;
    }
  };

  useEffect(() => {
    if (productManage) {
      console.log(productManage);
      setModalManageOpen(true);
      setChangeFloor(productManage?.product_floor);
      setChangeAddr(productManage?.product_addr ?? null);
      setChangeLot(productManage.lot_priority);
      setChangeLotAmount(productManage.lot_priority_amount);
      setSelectedImage(null);
      setPreviewImage(productManage.product_image_url ?? undefined);
      setSelectedImagesOther([]);
      setUploadEcomImage(false);
      setUploadOldSystemImage(false);
      setSidebarOpen(true); // เปิด sidebar เมื่อเปิด modal ใหม่

      // เรียก API เพื่อดึงรูปภาพ
      if (productManage.product_code) {
        getImageFromOldSystem(productManage.product_code);
        getIamgeForECommerce(productManage.product_code);
      }
    }
  }, [productManage]);

  // useEffect สำหรับ set previewImageOther เมื่อ imgOldSystem เปลี่ยน
  useEffect(() => {
    if (imgOldSystem?.imageOrderPicking?.additionalImages) {
      setPreviewImageOther(imgOldSystem.imageOrderPicking.additionalImages.map(img => img.product_img_url));
    }
  }, [imgOldSystem]);

  // Cleanup effect สำหรับล้าง preview URLs เมื่อ component unmount
  useEffect(() => {
    return () => {
      // ล้าง main image preview URL
      if (previewImage && previewImage.startsWith('blob:')) {
        cleanupPreviewUrl(previewImage);
      }
      // ล้าง additional images preview URLs
      previewImageOther?.forEach(url => {
        if (url && url.startsWith('blob:')) {
          cleanupPreviewUrl(url);
        }
      });
    };
  }, []);

  const handleImageChange = (index: number | null) => (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      handleFileSelect(e.target.files[0], index);
    }
  };

  const handleDeleteMainImage = () => {
    if (previewImage && previewImage.startsWith('blob:')) {
      cleanupPreviewUrl(previewImage);
    }
    setSelectedImage(null);
    setPreviewImage(productManage?.product_image_url ?? undefined); // กลับไปแสดงรูปเดิม
    // Reset file input
    const fileInput = document.getElementById('fileInputMain') as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleDeleteAdditionalImage = (index: number) => {
    console.log("Deleting additional image at index:", index);
    setSelectedImagesOther((prev) => {
      const newFiles = [...prev];
      newFiles[index] = null as unknown as File; // Remove file at index
      return newFiles;
    });
    setPreviewImageOther((prev) => {
      const newPreview = [...prev || []];
      // ล้าง preview URL
      if (newPreview[index] && newPreview[index]!.startsWith('blob:')) {
        cleanupPreviewUrl(newPreview[index]);
      }
      // กลับไปแสดงรูปเดิม
      if (imgOldSystem?.imageOrderPicking?.additionalImages?.[index]) {
        newPreview[index] = '';
      } else {
        newPreview[index] = ''; // ไม่มีรูปเดิม ให้แสดง placeholder หรือไม่แสดงอะไรเลย
      }
      console.log("Updated previewImageOther after deletion:", newPreview);
      return newPreview;
    });
    // Reset specific file input
    const fileInput = document.getElementById(`fileInputMain${index}`) as HTMLInputElement;
    if (fileInput) fileInput.value = '';
  };

  const handleSubmit = async () => {
    if (isUploading) return; // ป้องกัน double submission

    try {
      setIsUploading(true);
      setUploadProgress(0);
      setUploadErrors([]);

      // Validation
      if (!changeFloor || changeFloor === "" || changeFloor === "-") {
        showError("กรุณาระบุเลขชั้น");
        return;
      }

      const formData = new FormData();
      const barcodeToUpdate =
        productManage?.product_barcode ??
        productManage?.product_barcode2 ??
        productManage?.product_barcode3;

      if (productManage?.product_code) formData.append("pro_code", productManage.product_code);
      if (barcodeToUpdate) formData.append("barcode", barcodeToUpdate);
      if (changeFloor) formData.append("floor", changeFloor);
      if (changeAddr) formData.append("product_addr", changeAddr);
      if (changeLot) formData.append("lot", changeLot);
      if (changeAmount !== null) formData.append("amount", changeAmount.toString());

      if (selectedImage) formData.append("image", selectedImage);

      selectedImagesOther.forEach((file, index) => {
        if (file) {
          formData.append(`additionalImage_${index}`, file);
        }
      });

      if (uploadEcomImage) formData.append("uploadEcomImage", uploadEcomImage.toString());
      if (uploadOldSystemImage) formData.append("uploadOldSystemImage", uploadOldSystemImage.toString());
      if (editMode) formData.append("editMode", editMode.toString());

      setUploadProgress(50); // การ progress จำลอง

      const data = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/manage/update-product-detail`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
          onUploadProgress: (progressEvent) => {
            const progress = Math.round((progressEvent.loaded * 100) / (progressEvent.total || 1));
            setUploadProgress(progress);
          }
        }
      );

      if (data.status === 201) {
        setUploadProgress(100);

        // ล้าง preview URLs
        if (previewImage && previewImage.startsWith('blob:')) {
          cleanupPreviewUrl(previewImage);
        }
        previewImageOther?.forEach(url => {
          if (url && url.startsWith('blob:')) {
            cleanupPreviewUrl(url);
          }
        });

        if (barcode) {
          handleSearchProductList(barcode);
        } else {
          handleGetList();
        }

        setModalManageOpen(false);
        setProductManage(null);
        setChangeFloor(null);
        setChangeAddr(null);
        setSelectedImage(null);
        setPreviewImage(undefined);
        setPreviewImageOther([]);
        setSelectedImagesOther([]);
      } else {
        showError("มีบางอย่างผิดพลาด");
      }
    } catch (error) {
      console.error('Upload error:', error);
      showError("เกิดข้อผิดพลาดในการอัพโหลด");
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  const getIamgeForECommerce = async (pro_code: string) => {
    try {
      const ecomImageRes = await axios.get(
        `${import.meta.env.VITE_API_URL_ECOMMERCE
        }/api/ecom/get-product-image/${pro_code}`
      );
      setImgEcom(ecomImageRes.data);
    } catch (e) {
      console.error("Could not fetch e-commerce image", e);
    }
  };

  const getImageFromOldSystem = async (pro_code: string) => {
    try {
      const oldSystemImageRes = await axios.get(
        `${import.meta.env.VITE_API_URL_ORDER}/api/imageFromOldSystem/${pro_code}`
      );
      // API ส่งคืนข้อมูลใหม่ตาม structure ใหม่
      setImgOldSystem(oldSystemImageRes.data);
    } catch (e) {
      console.error("Could not fetch old system image", e);
    }
  };

  if (userInfo?.manage_product === "Yes") {
    return (
      <div className="flex flex-col justify-center items-left p-10">
        <Modal
          isOpen={modalManageOpen}
          onClose={() => setModalManageOpen(false)}
        >
          <div className="flex text-center justify-between items-center">
            <p className="text-3xl font-bold">ส่วนจัดการใบเบิก</p>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="bg-blue-500 hover:bg-blue-600 text-white px-4 py-2 rounded-lg transition-colors text-lg"
            >
              {sidebarOpen ? 'ซ่อน' : 'แสดง'}
            </button>
          </div>
          <div className="flex relative overflow-hidden mt-4 max-h-[80vh]">
            {/* Main Content - Images */}
            <div className={`transition-all duration-300 ease-in-out overflow-auto ${sidebarOpen ? 'w-[calc(100%-384px)] mr-4' : 'w-full'
              }`}>
              <div className="flex flex-col items-center p-4">

                {/* Error Messages */}
                {uploadErrors.length > 0 && (
                  <div className="w-full mb-4 p-3 bg-red-50 border-2 border-red-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <svg className="w-5 h-5 text-red-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <p className="font-semibold text-red-700">เกิดข้อผิดพลาด:</p>
                    </div>
                    <ul className="list-disc list-inside space-y-1">
                      {uploadErrors.map((error, index) => (
                        <li key={index} className="text-sm text-red-600">{error}</li>
                      ))}
                    </ul>
                  </div>
                )}

                {/* Upload Progress */}
                {isUploading && (
                  <div className="w-full mb-4 p-3 bg-blue-50 border-2 border-blue-200 rounded-lg">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
                      <p className="font-semibold text-blue-700">กำลังอัพโหลด...</p>
                    </div>
                    <div className="w-full bg-blue-200 rounded-full h-2">
                      <div
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      ></div>
                    </div>
                    <p className="text-xs text-blue-600 mt-1">{uploadProgress}% เสร็จสมบูรณ์</p>
                  </div>
                )}

                {imgOldSystem && (
                  <div className="w-full max-w-4xl mb-4">
                    {/* รูปภาพจาก Order Picking */}
                    {imgOldSystem.imageOrderPicking && (
                      <div>
                        <div className="flex items-center gap-3 mb-2 justify-between">
                          <h3 className="font-bold text-lg mb-2 text-gray-700">รูปจาก Order Picking System</h3>
                          <div className="flex items-center gap-2">
                            {editMode && (
                              <span className="text-xs text-gray-500 bg-gray-100 px-2 py-1 rounded">
                                ลาก & วาง หรือคลิกเพื่ออัพโหลด
                              </span>
                            )}
                            <button className="text-sm text-white bg-blue-500 hover:bg-blue-600 px-4 py-2 rounded-lg transition-colors" onClick={() => setEditMode(!editMode)}>
                              {editMode === true ? "ดูรูปภาพ" : "แก้ไขรูปภาพ"}
                            </button>
                          </div>
                        </div>

                        {/* Main Image */}
                        <div className="mb-4">
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">รูปหลัก</p>
                            {editMode && (
                              <p className="text-xs text-gray-500">
                                รองรับ: JPG, PNG, WebP | สูงสุด 10MB
                              </p>
                            )}
                          </div>
                          <div className="max-w-md mx-auto relative">
                            {(() => {
                              const hasMainImage = previewImage || (imgOldSystem?.imageOrderPicking?.mainImage && imgOldSystem.imageOrderPicking.mainImage !== '');
                              
                              if (hasMainImage) {
                                return (
                                  <>
                                    <img
                                      src={(previewImage?.startsWith("..")
                                        ? `https://www.wangpharma.com${previewImage.slice(2)}`
                                        : previewImage || product_icon || (
                                          imgOldSystem.imageOrderPicking.mainImage.startsWith("..")
                                            ? `https://www.wangpharma.com${imgOldSystem.imageOrderPicking.mainImage.slice(2)}`
                                            : imgOldSystem.imageOrderPicking.mainImage || product_icon
                                        ))}
                                      onClick={() => (editMode ? document.getElementById('fileInputMain')?.click() : null)}
                                      className={`w-full h-auto object-cover rounded border-2 border-blue-300 transition-opacity ${editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'}`}
                                      onError={(e) => {
                                        e.currentTarget.src = product_icon;
                                      }}
                                      alt="Main Order Picking Image"
                                    />
                                    <span className={`absolute top-2 right-2 px-2 py-1 rounded text-xs font-medium ${
                                      selectedImage ? 'bg-green-500 text-white' : 'bg-black bg-opacity-50 text-white'
                                    }`}>
                                      {selectedImage ? 'รูปใหม่' : 'รูปหลัก'}
                                    </span>
                                    {selectedImage && editMode && (
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          handleDeleteMainImage();
                                        }}
                                        className="absolute top-2 left-2 bg-red-500 hover:bg-red-600 text-white rounded-full w-6 h-6 flex items-center justify-center transition-colors shadow-lg"
                                        title="ลบรูปใหม่"
                                      >
                                        ×
                                      </button>
                                    )}
                                  </>
                                );
                              } else {
                                // ไม่มีรูปหลัก - แสดง placeholder หรือ product_icon
                                if (editMode) {
                                  return (
                                    <div
                                      className="w-full h-64 border-2 border-dashed border-gray-300 hover:border-blue-500 hover:bg-blue-50 cursor-pointer rounded flex items-center justify-center bg-gray-50 transition-all group"
                                      onClick={() => document.getElementById('fileInputMain')?.click()}
                                    >
                                      <div className="text-center">
                                        <div className="w-12 h-12 mx-auto mb-2 bg-gray-200 group-hover:bg-blue-200 rounded-full flex items-center justify-center transition-colors">
                                          <svg className="w-8 h-8 text-gray-400 group-hover:text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                          </svg>
                                        </div>
                                        <span className="text-sm text-gray-500 group-hover:text-blue-600 font-medium">เพิ่มรูปหลัก</span>
                                      </div>
                                      <span className="absolute top-2 right-2 bg-gray-400 group-hover:bg-blue-500 text-white text-xs px-2 py-1 rounded transition-colors">
                                        รูปหลัก
                                      </span>
                                    </div>
                                  );
                                } else {
                                  return (
                                    <div className="w-full h-64 flex items-center justify-center bg-gray-100 border-2 border-gray-200 rounded">
                                      <div className="text-center">
                                        <img
                                          src={product_icon}
                                          className="w-20 h-20 object-cover opacity-50 mb-2"
                                          alt="No Image Available"
                                        />
                                        <span className="text-sm text-gray-500">ไม่มีรูปหลัก</span>
                                      </div>
                                    </div>
                                  );
                                }
                              }
                            })()}
                          </div>
                          <input
                            id="fileInputMain"
                            type="file"
                            accept="image/*"
                            className="hidden"
                            onChange={handleImageChange(null)}
                          />
                        </div>

                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <p className="text-sm text-gray-600">รูปเพิ่มเติม</p>
                            {editMode && (
                              <p className="text-xs text-gray-500">
                                รองรับ: JPG, PNG, WebP | สูงสุด 5MB ต่อรูป | สูงสุด 4 รูป
                              </p>
                            )}
                          </div>
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                            {/* แสดงรูปที่มีอยู่เดิม */}
                            {imgOldSystem.imageOrderPicking.additionalImages?.map((img, index) => (
                              <div key={img.product_att_id} className="relative aspect-square">
                                <img
                                  src={(previewImageOther?.[index]?.startsWith("..")
                                    ? `https://www.wangpharma.com${previewImageOther?.[index].slice(2)}`
                                    : previewImageOther?.[index] || product_icon || (
                                      img.product_img_url.startsWith("..")
                                        ? `https://www.wangpharma.com${img.product_img_url.slice(2)}`
                                        : img.product_img_url || product_icon
                                    ))}
                                  className={`w-full h-full object-cover rounded border-2 border-gray-200 ${index <= 3 && editMode ? ' hover:border-green-500' : ''} ${index > 3 ? 'opacity-50' : ''} transition-colors ${editMode ? 'cursor-pointer' : 'cursor-default'}`}
                                  onClick={() => editMode && index <= 3 && document.getElementById(`fileInputMain${index}`)?.click()}
                                  onError={(e) => {
                                    e.currentTarget.src = product_icon;
                                  }}
                                  alt={`Additional Image ${index + 1}`}
                                />
                                <span className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                  {previewImageOther?.[index] && selectedImagesOther[index] && " (ใหม่)"}
                                </span>
                                {previewImageOther?.[index] && editMode && (
                                  <button
                                    onClick={() => handleDeleteAdditionalImage(index)}
                                    className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
                                    title="ลบรูปใหม่"
                                  >
                                    ×
                                  </button>
                                )}
                                {index <= 3 && (
                                  <input
                                    id={`fileInputMain${index}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange(index)}
                                  />
                                )}
                              </div>
                            ))}

                            {/* แสดงรูปใหม่ที่เพิ่งเลือกและปุ่มเพิ่มสำหรับตำแหน่งว่าง */}
                            {Array.from({ length: Math.max(0, 4 - (imgOldSystem.imageOrderPicking.additionalImages?.length || 0)) }).map((_, newIndex) => {
                              const actualIndex = (imgOldSystem.imageOrderPicking.additionalImages?.length || 0) + newIndex;
                              const previewUrl = previewImageOther?.[actualIndex];

                              return previewUrl ? (
                                // แสดงรูปที่มี preview
                                <div key={`new-${actualIndex}`} className="relative aspect-square">
                                  <img
                                    src={previewUrl}
                                    className={`w-full h-full object-cover rounded border-2 border-green-300 ${editMode ? 'hover:border-green-500 cursor-pointer' : 'cursor-default'} transition-colors`}
                                    onClick={() => editMode && document.getElementById(`fileInputMain${actualIndex}`)?.click()}
                                    onError={(e) => {
                                      e.currentTarget.src = product_icon;
                                    }}
                                    alt={`New Image ${actualIndex + 1}`}
                                  />
                                  <span className="absolute top-1 right-1 bg-green-500 text-white text-xs px-1 rounded">
                                    {actualIndex + 1}
                                  </span>
                                  {editMode && (
                                    <button
                                      onClick={() => handleDeleteAdditionalImage(actualIndex)}
                                      className="absolute top-1 left-1 bg-red-500 hover:bg-red-600 text-white rounded-full w-5 h-5 flex items-center justify-center text-xs transition-colors"
                                      title="ลบรูปใหม่"
                                    >
                                      ×
                                    </button>
                                  )}
                                  <input
                                    id={`fileInputMain${actualIndex}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange(actualIndex)}
                                  />
                                </div>
                              ) : (
                                // แสดงปุ่มเพิ่มสำหรับตำแหน่งที่ยังว่าง
                                <div key={`empty-${actualIndex}`} className="relative aspect-square">
                                  <div
                                    className={`w-full h-full border-2 border-dashed border-gray-300 ${editMode ? 'hover:border-green-500 hover:bg-green-50 cursor-pointer' : 'cursor-default'} rounded flex items-center justify-center bg-gray-50 transition-all group`}
                                    onClick={() => editMode && document.getElementById(`fileInputMain${actualIndex}`)?.click()}
                                  >
                                    <div className="text-center">
                                      <div className="w-8 h-8 mx-auto mb-1 bg-gray-200 group-hover:bg-green-200 rounded-full flex items-center justify-center transition-colors">
                                        <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                                        </svg>
                                      </div>
                                      <span className="text-xs text-gray-500 group-hover:text-green-600 font-medium">เพิ่มภาพ</span>
                                    </div>
                                    <span className="absolute top-1 right-1 bg-gray-400 group-hover:bg-green-500 text-white text-xs px-1 rounded transition-colors">
                                      {actualIndex + 1}
                                    </span>
                                  </div>
                                  <input
                                    id={`fileInputMain${actualIndex}`}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={handleImageChange(actualIndex)}
                                  />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      </div>
                    )}
                    {imgEcom && (
                      <div className="w-full mb-4">
                        <div className="flex items-center gap-3 mb-2">
                          <input
                            type="checkbox"
                            id="uploadEcomImage"
                            checked={uploadEcomImage}
                            onChange={(e) => setUploadEcomImage(e.target.checked)}
                            hidden={editMode === false}
                            className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                          />
                          <label htmlFor="uploadEcomImage" className="font-bold text-2xl text-center cursor-pointer">
                            รูปภาพจาก E-Commerce
                          </label>
                        </div>
                        <div className="space-y-3 grid grid-cols-5 gap-4">
                          <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-600 mb-1">รูปหลัก</p>
                            <img
                              src={
                                uploadEcomImage
                                  ? previewImage
                                  : imgEcom?.pro_imgmain
                                    ? imgEcom.pro_imgmain.startsWith("..")
                                      ? `https://www.wangpharma.com${imgEcom.pro_imgmain.slice(2)}`
                                      : imgEcom.pro_imgmain
                                    : product_icon
                              }
                              className={`w-32 h-32 rounded ${uploadEcomImage && editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                              onError={(e) => {
                                e.currentTarget.src = product_icon;
                              }}
                            />
                          </div>

                          <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-600 mb-1">รูปที่ 2</p>
                            <img
                              src={(uploadEcomImage ? previewImageOther?.[0] : (
                                imgEcom.pro_img2?.startsWith("..")
                                  ? `https://www.wangpharma.com${imgEcom.pro_img2?.slice(2)}`
                                  : imgEcom.pro_img2?.startsWith("images/")
                                    ? `https://www.wangpharma.com/${imgEcom.pro_img2}`
                                    : imgEcom.pro_img2 || product_icon
                              ))}
                              className={`w-32 h-32 rounded ${uploadEcomImage && editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                              onClick={() => uploadEcomImage && editMode && document.getElementById('fileInputEcom1')?.click()}
                              onError={(e) => {
                                e.currentTarget.src = product_icon;
                              }}
                            />
                          </div>
                          <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-600 mb-1">รูปที่ 3</p>
                            <img
                              src={((uploadEcomImage && previewImageOther?.[1]) || (
                                imgEcom.pro_img3?.startsWith("..")
                                  ? `https://www.wangpharma.com${imgEcom.pro_img3?.slice(2)}`
                                  : imgEcom.pro_img3?.startsWith("images/")
                                    ? `https://www.wangpharma.com/${imgEcom.pro_img3}`
                                    : imgEcom.pro_img3 || product_icon
                              ))}
                              className={`w-32 h-32 rounded ${uploadEcomImage && editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                              onClick={() => uploadEcomImage && editMode && document.getElementById('fileInputEcom2')?.click()}
                              onError={(e) => {
                                e.currentTarget.src = product_icon;
                              }}
                            />
                          </div>

                          <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-600 mb-1">รูปที่ 4</p>
                            <img
                              src={(uploadEcomImage ? previewImageOther?.[2] : (
                                imgEcom.pro_img4?.startsWith("..")
                                  ? `https://www.wangpharma.com${imgEcom.pro_img4?.slice(2)}`
                                  : imgEcom.pro_img4?.startsWith("images/")
                                    ? `https://www.wangpharma.com/${imgEcom.pro_img4}`
                                    : imgEcom.pro_img4 || product_icon
                              ))}
                              className={`w-32 h-32 rounded ${uploadEcomImage && editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                              onClick={() => uploadEcomImage && editMode && document.getElementById('fileInputEcom3')?.click()}
                              onError={(e) => {
                                e.currentTarget.src = product_icon;
                              }}
                            />
                          </div>

                          <div className="flex flex-col items-center">
                            <p className="text-sm text-gray-600 mb-1">รูปที่ 5</p>
                            <img
                              src={(uploadEcomImage ? previewImageOther?.[3] || product_icon : (
                                imgEcom.pro_img5?.startsWith("..")
                                  ? `https://www.wangpharma.com${imgEcom.pro_img5?.slice(2)}`
                                  : imgEcom?.pro_img5?.startsWith("images/")
                                    ? `https://www.wangpharma.com/${imgEcom?.pro_img5}`
                                    : imgEcom?.pro_img5 || product_icon
                              ))}
                              className={`w-32 h-32 rounded ${uploadEcomImage && editMode ? 'cursor-pointer hover:opacity-80' : 'cursor-default'} transition-opacity`}
                              onClick={() => uploadEcomImage && editMode && document.getElementById('fileInputEcom4')?.click()}
                              onError={(e) => {
                                e.currentTarget.src = product_icon;
                              }}
                            />
                          </div>
                        </div>
                      </div>
                    )}

                    <div className="w-full">
                      <div className="flex items-center gap-3 mb-4">
                        <input
                          type="checkbox"
                          id="uploadOldSystemImage"
                          checked={uploadOldSystemImage}
                          onChange={(e) => setUploadOldSystemImage(e.target.checked)}
                          hidden={editMode === false}
                          className="w-5 h-5 text-blue-600 bg-gray-100 border-gray-300 rounded focus:ring-blue-500"
                        />
                        <label htmlFor="uploadOldSystemImage" className="font-bold text-2xl text-center cursor-pointer">
                          รูปภาพจากระบบเก่า
                        </label>
                      </div>

                      <div className="mb-6">
                        <div className="flex justify-between gap-3 overflow-x-auto pb-2 scrollbar-thin scrollbar-thumb-gray-400 scrollbar-track-gray-200">
                          {Array.from({ length: Math.max(5, imgOldSystem.imagesOldSystem.length) }).map((_, index) => {
                            const img = imgOldSystem.imagesOldSystem[index];
                            return (
                              <div key={img?.product_old_img_id || `placeholder-${index}`} className="relative aspect-square flex-shrink-0 w-32 h-32">
                                <img
                                  src={((uploadOldSystemImage && (index === 0 ? previewImage?.startsWith("..")
                                    ? `https://www.wangpharma.com${previewImage.slice(2)}`
                                    : previewImage || product_icon : previewImageOther?.[index - 1]?.startsWith("..")
                                    ? `https://www.wangpharma.com${previewImageOther?.[index - 1]?.slice(2)}`
                                    : previewImageOther?.[index - 1] || product_icon)) || img?.old_img_url || product_icon)}
                                  className={`w-32 h-32 object-cover rounded border-2 border-gray-200 ${uploadOldSystemImage && editMode ? 'hover:border-blue-500 cursor-pointer hover:opacity-80' : 'cursor-default'} transition-colors`}
                                  onClick={() => uploadOldSystemImage && editMode && document.getElementById(`fileInputOldSystem${index}`)?.click()}
                                  onError={(e) => {
                                    e.currentTarget.src = product_icon;
                                  }}
                                  alt={`Old System Image ${index + 1}`}
                                />
                                <span className="absolute top-1 right-1 bg-black bg-opacity-50 text-white text-xs px-1 rounded">
                                  {index + 1}
                                </span>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Sidebar */}
            <div className={`transition-all duration-300 bg-gray-50 border-l-2 border-gray-200 overflow-hidden ${sidebarOpen ? 'w-96 min-w-96' : 'w-0'
              }`}>
              <div className="h-full overflow-auto p-4">
                <div className="flex flex-col justify-between h-full">
                  <div>
                    <p className="text-3xl font-bold mt-2 line-clamp-2">
                      {productManage?.product_name}
                    </p>
                    <p className="text-lg mt-4">
                      รหัสสินค้า : {productManage?.product_code}
                    </p>

                    <div className="mt-4">
                      <p className="font-bold text-xl mb-1">สินค้าอยู่ในชั้น</p>
                      <div className="flex items-center">
                        <input
                          className="border-2 text-2xl w-full border-green-600 rounded-sm text-center text-green-800 font-bold p-2"
                          type="text"
                          value={changeFloor ?? ""}
                          onChange={(e) => {
                            setChangeFloor(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="font-bold text-xl mb-1">ที่อยู่สินค้า (Address)</p>
                      <div className="flex items-center">
                        <input
                          className="border-2 text-2xl w-full border-green-600 rounded-sm text-center text-green-800 font-bold p-2"
                          type="text"
                          value={changeAddr ?? ""}
                          placeholder="F"
                          onChange={(e) => {
                            setChangeAddr(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="font-bold text-xl mb-1">
                        จำกัดการขายเฉพาะ Lot
                      </p>
                      <div className="flex items-center">
                        <input
                          readOnly={true}
                          className="border-2 text-2xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                          type="text"
                          value={changeLot ?? "ไม่มีการจำกัด LOT"}
                          onChange={(e) => {
                            setChangeLot(e.target.value);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-4">
                      <p className="font-bold text-xl mb-1">จำนวน</p>
                      <div className="flex items-center">
                        <input
                          readOnly={true}
                          className="border-2 text-2xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                          type="text"
                          value={changeAmount ?? "ไม่มีการจำกัด LOT"}
                          onChange={(e) => {
                            setChangeLotAmount(Number(e.target.value));
                          }}
                        />
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-2 w-full justify-end mt-6">
                    <button
                      disabled={
                        isUploading ||
                        changeFloor === null ||
                        changeFloor === "" ||
                        changeFloor === "-"
                      }
                      className={`text-center text-white text-lg p-2 rounded-lg px-6 cursor-pointer flex items-center gap-2 ${!isUploading && changeFloor !== null &&
                          changeFloor !== "" &&
                          changeFloor !== "-"
                          ? "hover:bg-green-800 bg-green-700"
                          : "hover:bg-gray-600 bg-gray-500"
                        }`}
                      onClick={() => handleSubmit()}
                    >
                      {isUploading ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                          กำลังบันทึก...
                        </>
                      ) : (
                        'บันทึก'
                      )}
                    </button>
                    <div
                      className="text-center text-white bg-red-700 text-lg p-2 rounded-lg hover:bg-red-800 cursor-pointer px-4"
                      onClick={() => {
                        setModalManageOpen(false);
                        setProductManage(null);
                        setChangeFloor(null);
                        setChangeAddr(null);
                        setSelectedImage(null);
                        setPreviewImage(null);
                        setPreviewImageOther(null);
                        setSelectedImagesOther([]);
                        setUploadEcomImage(false);
                        setUploadOldSystemImage(false);
                        setImgEcom(null);
                        setImgOldSystem(null);
                      }}
                    >
                      ยกเลิก
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </Modal>
        <p className="font-bold text-4xl">จัดการรายการสินค้า</p>

        <div className="flex">
          <div className="p-2 bg-gray-200 flex w-fit mt-4 gap-3 rounded-lg">
            <div
              className={`p-2 font-semibold text-lg rounded-sm ${isSelect === 1
                ? "bg-white text-black shadow-2xl"
                : "text-gray-600"
                } cursor-pointer`}
              onClick={() => {
                setIsSelect(1);
              }}
            >
              รายการสินค้า
            </div>
            <div
              className={`p-2 font-semibold text-lg rounded-sm ${isSelect === 2
                ? "bg-white text-black shadow-2xl"
                : "text-gray-600"
                } cursor-pointer`}
              onClick={() => {
                setIsSelect(2);
              }}
            >
              รายการสินค้าจำกัด Lot
            </div>
          </div>
          <input
            className="border-3 text-2xl w-200 border-gray-600 rounded-lg text-center text-gray-800 font-bold p-2 mt-4 ml-2"
            type="text"
            placeholder="สแกนบาร์โค้ดสินค้า"
            onChange={(e) => { setBarcode(e.target.value) }}
            value={barcode || ''}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                if (!barcode) {
                  handleGetList();
                } else {
                  handleSearchProductList(barcode);
                }
              }
            }}
          />
        </div>

        <div className="flex mt-10 gap-3">
          {offset >= 18 && (
            <p
              className="text-lg bg-blue-500 cursor-pointer font-bold text-white p-2 rounded-sm select-none"
              onClick={() => {
                setOffset(offset - 18);
              }}
            >
              ย้อนกลับ
            </p>
          )}
          {productList && productList.length >= 18 && (
            <p
              className="text-lg bg-blue-500 cursor-pointer font-bold text-white p-2 rounded-sm select-none"
              onClick={() => {
                setOffset(offset + 18);
              }}
            >
              หน้าถัดไป
            </p>
          )}
        </div>
        <p className="text-xl text-blue-500 mt-2">หน้าที่ {offset / 18 + 1}</p>

        {loading ? (
          <div className="flex justify-center items-center h-64 w-full mt-4">
            <div className="w-12 h-12 border-4 border-gray-300 border-t-blue-500 rounded-full animate-spin"></div>
            <p className="ml-4 text-xl text-gray-600 font-bold">กำลังโหลดข้อมูล...</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-4">
            {productList?.map((prod) => {
              return (
                <div className="bg-gray-100 drop-shadow-xl p-4 border-2 border-gray-200 rounded-lg"
                >
                  <div className="w-full aspect-square overflow-hidden rounded-sm">
                    <img
                      src={
                        prod.product_image_url?.startsWith("..")
                          ? `https://www.wangpharma.com${prod.product_image_url.slice(
                            2
                          )}`
                          : prod.product_image_url || product_icon
                      }
                      className="w-full h-full object-cover"
                      alt="Product"
                    />
                  </div>
                  <p className="text-2xl mt-3 font-bold truncate w-full">
                    {prod.product_name}
                  </p>
                  <p className="text-lg mt-1 text-blue-500">
                    รหัสสินค้า : {prod.product_code}
                  </p>
                  <p className="text-lg mt-1 text-green-600">
                    ประจำอยู่ชั้น : {prod.product_floor || "ไม่มีเลขชั้น"}
                  </p>
                  {prod.lot_priority && (
                    <p className="text-lg mt-0.5 text-red-600">
                      จำกัด Lot : {prod.lot_priority}
                    </p>
                  )}
                  <div className="w-full flex items-center justify-end">
                    <button
                      className="px-3 py-2 bg-blue-500 rounded-sm text-white mt-2 hover:bg-blue-600 cursor-pointer"
                      onClick={() => {
                        handleGetProductDetail(
                          prod.product_barcode ||
                          prod.product_barcode2 ||
                          prod.product_barcode3 ||
                          prod.product_code ||
                          null
                        );
                        getIamgeForECommerce(prod.product_code);
                        getImageFromOldSystem(prod.product_code);
                      }}
                    >
                      จัดการสินค้า
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  }
  return (
    <div className="flex flex-col min-h-screen text-center items-center justify-center">
      <p className="text-2xl font-bold text-red-700">
        คุณไม่มีสิทธิ์สำหรับการเข้าใช้หน้านี้
      </p>
    </div>
  );
};
export default ProductManage;
