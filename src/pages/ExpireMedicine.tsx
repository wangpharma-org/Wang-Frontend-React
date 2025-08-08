import { useState, useRef } from 'react';
import Success from "../assets/mark.png"
import Errors from "../assets/error.png"

const Drungs = () => {

    const [resultMessage, setResultMessage] = useState('');
    const emailRef = useRef<HTMLInputElement>(null);
    const cc1Ref = useRef<HTMLInputElement>(null);
    const cc2Ref = useRef<HTMLInputElement>(null);
    const cc3Ref = useRef<HTMLInputElement>(null);
    const fileRef = useRef<HTMLInputElement>(null);

    const handleSubmit = async (e: any) => {
        e.preventDefault();

        if (
            !emailRef.current ||
            !cc1Ref.current ||
            !cc2Ref.current ||
            !cc3Ref.current ||
            !fileRef.current?.files?.[0]
        ) {
            // Append form data{
            setResultMessage('❌ Missing required fields.');
            return;
        }

        const ccList = [
            cc1Ref.current.value,
            cc2Ref.current.value,
            cc3Ref.current.value,
        ].filter((cc) => cc !== '').join(',');

        const formData = new FormData();
        formData.append('to', emailRef.current.value);
        formData.append('cc', ccList);
        formData.append('attachment', fileRef.current.files[0]);


        try {
            const response = await fetch(
                `http://localhost:3008/api/send-email`,
                {
                    method: 'POST',
                    body: formData,
                }
            );

            console.log('Form Data:', emailRef.current.value);
            console.log('CC List:', ccList);
            console.log('File:', fileRef.current.files[0]);
            console.log('Response:', response);

            if (response.ok) {
                setResultMessage('Uploaded successfully!');
            } else {
                setResultMessage(`❌ Upload failed. Status: ${response.status}`);
                throw new Error(`Upload failed with status: ${response.status}`);
            }
        } catch (error) {
            const err = error as Error;
            console.error('Error uploading file:', err);
            setResultMessage(`Error`);
        }
    };

    const [fileName, setFileName] = useState("");

    const handleFileChange = (e: any) => {
        const file = e.target.files[0];
        if (file) {
            setFileName(file.name); // เก็บชื่อไฟล์
        }
    };

    const [ccList, setCcList] = useState([{ id: 1, value: '' }]);

    const handleChange = (id: number, value: string) => {
        setCcList((prev) =>
            prev.map((cc) => (cc.id === id ? { ...cc, value } : cc))
        );
    };

    const handleAdd = () => {
        if (ccList.length < 3) {
            setCcList((prev) => [...prev, { id: Date.now(), value: '' }]);
        }
    };

    const handleRemove = (id: number) => {
        if (ccList.length <= 1) return;
        setCcList(prev => prev.filter(cc => cc.id !== id));
    };

    return (
        <div className='flex flex-col border border-gray-300 rounded-xl px-10 py-5 my-15 mx-auto shadow w-[35%]'>
            <div className='flex justify-center border-b border-gray-400'>
                <p className='text-gray-800 font-bold text-2xl p-2 mb-3'>ระบบส่งอีเมล</p>
            </div>
            <form onSubmit={handleSubmit} className='pt-5 mx-10'>
                <label htmlFor="email" className='text-gray-700'>Email</label><br />
                <input type="email" id="email" name="email" ref={emailRef} required placeholder="you@example.com" className="border-b px-2 w-full py-2 border-gray-400 focus:outline-none " /><br /><br />

                {ccList.map((cc, index) => (
                    <label key={cc.id} htmlFor={`cc${index + 1}`}>
                        <div className="flex items-center text-gray-700 justify-between">
                            <div className="flex items-center ">
                                <p>CC Email {index + 1}</p>
                                <p className="text-gray-500 text-xs pl-2">ไม่จำเป็น</p>
                            </div>
                            <div className="">
                                {index === ccList.length - 1 && ccList.length < 3 && (
                                    <button
                                        type="button"
                                        onClick={handleAdd}
                                        className="bg-gray-200 text-gray-500 px-3 py-1 rounded"
                                        title="เพิ่ม CC"
                                    >
                                        +
                                    </button>
                                )}

                                {index === ccList.length - 1 && ccList.length > 1 && (
                                    <button
                                        type="button"
                                        onClick={() => handleRemove(cc.id)}
                                        className="px-4 py-1 rounded ml-2 bg-gray-200 text-gray-500"
                                        title="ลบ CC"
                                    >
                                        -
                                    </button>
                                )}
                            </div>
                        </div>
                        <input
                            type="email"
                            id={`cc${index + 1}`}
                            name={`cc${index + 1}`}
                            value={cc.value}
                            onChange={(e) => handleChange(cc.id, e.target.value)}
                            placeholder="you@example.com"
                            className="border-b px-2 w-full py-2 border-gray-400 focus:outline-none"
                        />
                        <br />
                        <br />
                    </label>
                ))}

                <div className="flex items-center justify-center w-full mb-3">
                    <label className="flex flex-col items-center justify-center w-full h-28 border-2 border-gray-300 border-dashed rounded-lg cursor-pointer bg-gray-100">
                        <div className="flex flex-col items-center justify-center pt-5 pb-6 px-3">
                            <svg
                                className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400"
                                aria-hidden="true"
                                xmlns="http://www.w3.org/2000/svg"
                                fill="none"
                                viewBox="0 0 20 16"
                            >
                                <path
                                    stroke="currentColor"
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth="2"
                                    d="M13 13h3a3 3 0 0 0 0-6h-.025A5.56 5.56 0 0 0 16 6.5 5.5 5.5 0 0 0 5.207 5.021C5.137 5.017 5.071 5 5 5a4 4 0 0 0 0 8h2.167M10 15V6m0 0L8 8m2-2 2 2"
                                />
                            </svg>
                            {fileName === "" ? (
                                <p className="mb-2 text-sm text-gray-500">
                                    <span className="font-semibold">Click to upload</span>
                                </p>
                            ) : (
                                <div className="mt-2 text-sm text-gray-500">
                                    <p>
                                        <span className="font-semibold">เลือกไฟล์: {fileName}</span>
                                    </p>
                                </div>
                            )}
                        </div>

                        <input
                            id="dropzone-file"
                            type="file"
                            className="hidden"
                            ref={fileRef}
                            onChange={handleFileChange}
                        />
                    </label>
                </div>

                <div className='flex justify-center '>
                    <button type="submit" className=" px-15 py-2 rounded-lg bg-emerald-500 text-white font-semibold shadow hover:bg-emerald-600">ส่ง Email</button>
                </div>
            </form>

            <div className='flex justify-center font-semibold'>
                {resultMessage === "Error" ?
                    <div className='flex flex-col my-2'>
                        <img src={Errors} className='w-8 h-8 mx-auto' />
                        <p className='mt-2 text-red-500 px-2'>ส่ง Email ไม่สำเร็จ</p>
                    </div> :
                    resultMessage === "Uploaded successfully!" ?
                        <div className='flex flex-col my-2'>
                            <img src={Success} className='w-8 h-8 mx-auto' />
                            <p className='mt-2 text-green-500 px-2'>ส่ง Email สำเร็จ</p>
                        </div> :
                        <div className='invisible'>
                            -
                        </div>
                }
            </div>
        </div>
    );
}

export default Drungs;