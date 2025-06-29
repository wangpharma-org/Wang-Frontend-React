import { useState, useRef } from 'react';

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
                setResultMessage('✅ Uploaded successfully!');
            } else {
                setResultMessage(`❌ Upload failed. Status: ${response.status}`);
                throw new Error(`Upload failed with status: ${response.status}`);    
            }
        } catch (error) {
            const err = error as Error;
            console.error('Error uploading file:', err);
            setResultMessage(`❌ Error: ${err.message}`);
        }
    };

    return (
        <div style={{ padding: '1rem' }}>
            <h1>Test Repo Expired Medicine feature sendEmail and receiveEmail</h1>
            <form onSubmit={handleSubmit}>
                <label htmlFor="email">📧 Email (To):</label><br />
                <input type="email" id="email" name="email" ref={emailRef} required className="border px-1" /><br /><br />

                <label htmlFor="cc1">📄 CC (optional):</label><br />
                <input type="email" id="cc1" name="cc1" ref={cc1Ref} placeholder="you@example.com" className="border px-1" /><br /><br />

                <label htmlFor="cc2">📄 CC (optional):</label><br />
                <input type="email" id="cc2" name="cc2" ref={cc2Ref} placeholder="you@example.com" className="border px-1" /><br /><br />

                <label htmlFor="cc3">📄 CC (optional):</label><br />
                <input type="email" id="cc3" name="cc3" ref={cc3Ref} placeholder="you@example.com" className="border px-1" /><br /><br />

                <label htmlFor="file">📁 Select File:</label><br />
                <input type="file" id="file" name="file" ref={fileRef} required className="border px-1" /><br /><br />

                <button type="submit" className="border">📨 Upload and Send</button>
            </form>

            <div style={{ marginTop: '20px', color: 'green' }}>{resultMessage}</div>
        </div>
    );
}

export default Drungs;