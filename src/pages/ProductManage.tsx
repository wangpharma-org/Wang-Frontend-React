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

const ProductManage = () => {
  const [isSelect, setIsSelect] = useState<number>(1);
  const [productList, setProductList] = useState<Product[] | null>(null);
  const [limit] = useState<number>(18);
  const [offset, setOffset] = useState<number>(0);
  const [modalManageOpen, setModalManageOpen] = useState<boolean>(false);
  const [productManage, setProductManage] = useState<Product | null>(null);
  const [, setErrMsg] = useState<string | null>(null);
  const [changeFloor, setChangeFloor] = useState<string | null>(null);
  const [changeAddr, setChangeAddr] = useState<string | null>(null);
  const [changeLot, setChangeLot] = useState<string | null>(null);
  const [changeAmount, setChangeLotAmount] = useState<number | null>(null);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [previewImage, setPreviewImage] = useState<string | null>(null);
  const { userInfo } = useAuth();
  const [barcode, setBarcode] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(false);

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

  console.log("manage product : ", userInfo?.manage_product);

  useEffect(() => {
    if (productManage) {
      console.log(productManage);
      setModalManageOpen(true);
      setChangeFloor(productManage?.product_floor);
      setChangeAddr(productManage?.product_addr ?? null);
      setChangeLot(productManage.lot_priority);
      setChangeLotAmount(productManage.lot_priority_amount);
      setSelectedImage(null);
      setPreviewImage(null);
    }
  }, [productManage]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSelectedImage(file);
      setPreviewImage(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async () => {
    try {
      const formData = new FormData();
      const barcodeToUpdate =
        productManage?.product_barcode ??
        productManage?.product_barcode2 ??
        productManage?.product_barcode3;

      if (barcodeToUpdate) formData.append("barcode", barcodeToUpdate);
      if (changeFloor) formData.append("floor", changeFloor);
      if (changeAddr) formData.append("product_addr", changeAddr);
      if (changeLot) formData.append("lot", changeLot);
      if (changeAmount !== null) formData.append("amount", changeAmount.toString());
      if (selectedImage) formData.append("image", selectedImage); // แนบไฟล์รูปภาพที่เลือกใหม่

      const data = await axios.post(
        `${import.meta.env.VITE_API_URL_ORDER}/api/manage/update-product-detail`,
        formData,
        {
          headers: {
            "Content-Type": "multipart/form-data",
          },
        }
      );
      if (data.status === 201) {
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
        setPreviewImage(null);
      } else {
        setErrMsg("มีบางอย่างผิดพลาด");
      }
    } catch {
      setErrMsg("มีบางอย่างผิดพลาด");
    }
  };

  if (userInfo?.manage_product === "Yes") {
    return (
      <div className="flex flex-col justify-center items-left p-10">
        <Modal
          isOpen={modalManageOpen}
          onClose={() => setModalManageOpen(false)}
        >
          <div className="flex text-center justify-center">
            <p className="text-3xl font-bold">ส่วนจัดการใบเบิก</p>
          </div>
          <div className="grid grid-cols-2">
            <div className="col-span-1 mt-3 flex flex-col items-center">
              <div className="col-span-1 mt-3">
                <img
                  src={
                    previewImage
                      ? previewImage
                      : productManage?.product_image_url?.startsWith("..")
                        ? `https://www.wangpharma.com${productManage?.product_image_url?.slice(
                          2
                        )}`
                        : productManage?.product_image_url || product_icon
                  }
                  className="w-full h-full object-cover"
                />
              </div>
              <label className="mt-4 bg-blue-500 hover:bg-blue-600 text-white font-bold py-2 px-4 rounded cursor-pointer shadow-md transition-colors">
                เลือกรูปภาพใหม่
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={handleImageChange}
                />
              </label>
            </div>
            <div className="col-span-1 ml-3 flex flex-col justify-between">
              <div>
                <p className="text-4xl font-bold mt-6 line-clamp-2">
                  {productManage?.product_name}
                </p>
                <p className="text-xl mt-4">
                  รหัสสินค้า : {productManage?.product_barcode}
                </p>

                <div className="mt-4">
                  <p className="font-bold text-2xl mb-1">สินค้าอยู่ในชั้น</p>
                  <div className="flex items-center">
                    <input
                      className="border-3 text-4xl w-full border-green-600 rounded-sm text-center text-green-800 font-bold p-2"
                      type="text"
                      value={changeFloor ?? ""}
                      onChange={(e) => {
                        setChangeFloor(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="font-bold text-2xl mb-1">ที่อยู่สินค้า (Address)</p>
                  <div className="flex items-center">
                    <input
                      className="border-3 text-4xl w-full border-green-600 rounded-sm text-center text-green-800 font-bold p-2"
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
                  <p className="font-bold text-2xl mb-1">
                    จำกัดการขายเฉพาะ Lot
                  </p>
                  <div className="flex items-center">
                    <input
                      readOnly={true}
                      className="border-3 text-4xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                      type="text"
                      value={changeLot ?? "ไม่มีการจำกัด LOT"}
                      onChange={(e) => {
                        setChangeLot(e.target.value);
                      }}
                    />
                  </div>
                </div>

                <div className="mt-4">
                  <p className="font-bold text-2xl mb-1">จำนวน</p>
                  <div className="flex items-center">
                    <input
                      readOnly={true}
                      className="border-3 text-4xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                      type="text"
                      // value={productManage?.product_floor || ''}
                      value={changeAmount ?? "ไม่มีการจำกัด LOT"}
                      onChange={(e) => {
                        setChangeLotAmount(Number(e.target.value));
                      }}
                    />
                  </div>
                </div>
              </div>

              <div className="flex gap-3 w-full justify-end mt-4">
                <button
                  disabled={
                    changeFloor === null ||
                    changeFloor === "" ||
                    changeFloor === "-"
                  }
                  className={`text-center text-white text-lg p-2 rounded-lg px-8 cursor-pointer ${changeFloor !== null &&
                    changeFloor !== "" &&
                    changeFloor !== "-"
                    ? "hover:bg-green-800 bg-green-700"
                    : "hover:bg-gray-600 bg-gray-500"
                    }`}
                  onClick={() => handleSubmit()}
                >
                  บันทึก
                </button>
                <div
                  className="text-center text-white bg-red-700 text-lg p-2 rounded-lg hover:bg-red-800 cursor-pointer px-5"
                  onClick={() => {
                    setModalManageOpen(false);
                    setProductManage(null);
                    setChangeFloor(null);
                    setChangeAddr(null);
                    setSelectedImage(null);
                    setPreviewImage(null);
                  }}
                >
                  ยกเลิก
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
                  key={prod.product_barcode ?? prod.product_barcode2 ?? prod.product_code}
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
                          prod.product_barcode ??
                          prod.product_barcode2 ??
                          prod.product_barcode3 ??
                          null
                        );
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
