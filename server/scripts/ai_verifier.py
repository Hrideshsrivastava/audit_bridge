import sys
import os
import json  # ✅ Required for JSON output
import pdfplumber
import pytesseract
from pdf2image import convert_from_path
from PIL import Image
import google.generativeai as genai

# Helper to print JSON and exit securely
def print_result(verdict, reason):
    # This is the ONLY thing printed to stdout
    print(json.dumps({"verdict": verdict, "reason": reason}))
    sys.exit(0)

# 1. SETUP
api_key = os.environ.get("GEMINI_API_KEY")

if not api_key:
    sys.stderr.write("❌ Error: GEMINI_API_KEY not found.\n")
    # Fail OPEN (Allow upload if Key is missing to prevent blocking business)
    print_result("YES", "AI Key Missing")

# Configure Gemini
genai.configure(api_key=api_key)
model = genai.GenerativeModel('gemini-2.5-flash')

def extract_text(file_path):
    text = ""
    ext = os.path.splitext(file_path)[1].lower()
    try:
        if ext == ".pdf":
            with pdfplumber.open(file_path) as pdf:
                if len(pdf.pages) > 0:
                    text = pdf.pages[0].extract_text() or ""
            # OCR fallback
            if len(text.strip()) < 50:
                try:
                    images = convert_from_path(file_path, first_page=1, last_page=1)
                    if images:
                        text = pytesseract.image_to_string(images[0])
                except:
                    pass 
        elif ext in [".jpg", ".jpeg", ".png"]:
            text = pytesseract.image_to_string(Image.open(file_path))
    except:
        return ""
    return text[:3000].strip()

def verify_document(extracted_text, expected_type):
    if not extracted_text or len(extracted_text) < 10:
        # You can choose to Reject empty files with a specific reason
        return "NO", "The file appears to be empty or unreadable."

    prompt = (
        f"Act as a strict Validation Auditor. Validate this document.\n"
        f"Claimed Type: '{expected_type}'\n\n"
        f"--- EXTRACTED TEXT ---\n"
        f"{extracted_text}\n"
        f"--- END TEXT ---\n\n"
        f"RULES:\n"
        f"1. Is this a school/college paper? (Look for: 'Marks', 'Question 1', 'Lab Test', 'Course', 'Semester'). IF YES -> REJECT.\n"
        f"2. Is this a code snippet? (Look for: 'Java', 'Python', 'void main', 'class'). IF YES -> REJECT.\n"
        f"3. Does it look like a valid '{expected_type}'? IF YES -> ACCEPT.\n\n"
        f"Provide response in this exact format:\n"
        f"REASON: [A short, clear sentence explaining WHY it was accepted or rejected to the user]\n"
        f"VERDICT: [YES or NO]"
    )

    try:
        response = model.generate_content(prompt)
        content = response.text.strip()
        
        # Log thought process to stderr (visible in Node terminal)
        sys.stderr.write(f"\n🤖 AI Analysis:\n{content}\n")
        
        # Parse the text response
        verdict = "NO"
        reason = "Content did not match the required document type."
        
        lines = content.split('\n')
        for line in lines:
            if "VERDICT:" in line:
                verdict = line.split("VERDICT:")[1].strip().upper()
            if "REASON:" in line:
                reason = line.split("REASON:")[1].strip()
        
        if "YES" in verdict:
            return "YES", "Valid"
        else:
            return "NO", reason

    except Exception as e:
        sys.stderr.write(f"❌ AI Critical Error: {e}\n")
        return "YES", "AI Error Bypassed"

if __name__ == "__main__":
    if len(sys.argv) < 3:
        print_result("NO", "Internal Error: Missing arguments")

    file_path = sys.argv[1]
    doc_type = sys.argv[2]

    data = extract_text(file_path)
    
    # Debug Preview to stderr
    sys.stderr.write(f"\n📝 Extracted Text Preview: {data[:200]}...\n")

    verdict, reason = verify_document(data, doc_type)
    
    # ✅ OUTPUT JSON TO STDOUT
    print_result(verdict, reason)