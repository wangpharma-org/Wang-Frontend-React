import { useEffect, useState } from "react";
import axios from "axios";
import product_icon from "../assets/product-17.png";
import Modal from "../components/ModalQC";

export interface Product {
  product_code: string;
  product_name: string;
  product_image_url: string | null;
  lot_priority: string | null;
  product_floor: string | null;
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
  const [errMsg, setErrMsg] = useState<string | null>(null);
  const [changeFloor, setChangeFloor] = useState<string | null>(null);
  const [changeLot, setChangeLot] = useState<string | null>(null);
  const [changeAmount, setChangeLotAmount] = useState<number | null>(null);

  const handleGetList = async () => {
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

  const handleGetProductDetail = async (barcode: string | null) => {
    if (barcode) {
      console.log(barcode);
      const data = await axios.post(
        `${
          import.meta.env.VITE_API_URL_ORDER
        }/api/manage/get-product-detail-manage`,
        {
          barcode,
        }
      );
      console.log("data : ", data.data);
      if (data) {
        setProductManage(data.data);
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
      setChangeLot(productManage.lot_priority);
      setChangeLotAmount(productManage.lot_priority_amount);
    }
  }, [productManage]);

  const handleSubmit = async () => {
    const data = await axios.post(
      `${import.meta.env.VITE_API_URL_ORDER}/api/manage/update-product-detail`,
      {
        barcode:
          productManage?.product_barcode ??
          productManage?.product_barcode2 ??
          productManage?.product_barcode3,
        floor: changeFloor,
        lot: changeLot ?? null ,
        amount: changeAmount ?? null,
      }
    );
    if (data.status === 201) {
      handleGetList();
      setModalManageOpen(false);
      setProductManage(null);
      setChangeFloor(null);
    } else {
      setErrMsg("มีบางอย่างผิดพลาด");
    }
  };

  // const onClose = () => {
  //   setProductManage(null);
  //   setModalManageOpen(false);
  // };

  return (
    <div className="flex flex-col justify-center items-left p-10">
      <Modal isOpen={modalManageOpen} onClose={() => setModalManageOpen(false)}>
        <div className="flex text-center justify-center">
          <p className="text-3xl font-bold">ส่วนจัดการใบเบิก</p>
        </div>
        <div className="grid grid-cols-2">
          <div className="col-span-1 mt-3">
            <img
              src={
                productManage?.product_image_url?.startsWith("..")
                  ? `https://www.wangpharma.com${productManage?.product_image_url?.slice(
                      2
                    )}`
                  : productManage?.product_image_url || product_icon
              }
              className="w-lg rounded-lg drop-shadow-2xl"
            ></img>
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
                    // value={productManage?.product_floor || ''}
                    value={changeFloor ?? ""}
                    onChange={(e) => {
                      setChangeFloor(e.target.value);
                    }}
                  />
                </div>
              </div>

              <div className="mt-4">
                <p className="font-bold text-2xl mb-1">จำกัดการขายเฉพาะ Lot</p>
                <div className="flex items-center">
                  <input
                    className="border-3 text-4xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                    type="text"
                    // value={productManage?.product_floor || ''}
                    value={changeLot ?? ""}
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
                    className="border-3 text-4xl w-full border-red-600 rounded-sm text-center text-red-800 font-bold p-2"
                    type="text"
                    // value={productManage?.product_floor || ''}
                    value={changeAmount ?? ""}
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
                className={`text-center text-white text-lg p-2 rounded-lg px-8 cursor-pointer ${
                  changeFloor !== null &&
                  changeFloor !== "" &&
                  changeFloor !== "-"
                    ? "hover:bg-green-800 bg-green-700"
                    : "hover:bg-gray-600 bg-gray-500"
                }`}
                onClick={() => handleSubmit()}
              >
                ยืนยัน
              </button>
              <div
                className="text-center text-white bg-red-700 text-lg p-2 rounded-lg hover:bg-red-800 cursor-pointer px-5"
                onClick={() => {
                  setModalManageOpen(false);
                  setProductManage(null);
                  setChangeFloor(null);
                }}
              >
                ยกเลิก
              </div>
            </div>
          </div>
        </div>
      </Modal>
      <p className="font-bold text-4xl">จัดการรายการสินค้า</p>
      <div className="p-2 bg-gray-200 flex w-fit mt-4 gap-3 rounded-lg">
        <div
          className={`p-2 font-semibold text-lg rounded-sm ${
            isSelect === 1 ? "bg-white text-black shadow-2xl" : "text-gray-600"
          } cursor-pointer`}
          onClick={() => {
            setIsSelect(1);
          }}
        >
          รายการสินค้า
        </div>
        <div
          className={`p-2 font-semibold text-lg rounded-sm ${
            isSelect === 2 ? "bg-white text-black shadow-2xl" : "text-gray-600"
          } cursor-pointer`}
          onClick={() => {
            setIsSelect(2);
          }}
        >
          รายการสินค้าจำกัด Lot
        </div>
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

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 2xl:grid-cols-6 gap-4 mt-4">
        {productList?.map((prod) => {
          return (
            <div className="bg-gray-100 drop-shadow-xl p-4 border-2 border-gray-200 rounded-lg">
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
    </div>
  );
};
export default ProductManage;
