import openpyxl, json, os, re
BASE="/home/hayder/sms/new real datat"; OUT=os.path.join(BASE,"seed")
wb=openpyxl.load_workbook(os.path.join(BASE,"staff  performance information.xlsx"),data_only=True,read_only=True)
ws=wb["performance"]
rows=list(ws.iter_rows(values_only=True))
def g(r,i): return (str(r[i]).strip() if len(r)>i and r[i] is not None else "")
def num(s):
    s=str(s or "").replace(",",".").strip()
    try: return round(float(s),2)
    except: return None
scores=[]; staff=[]
for i,r in enumerate(rows):
    if i<4: continue
    name=g(r,1); job=g(r,2)
    if not name: continue
    staff.append({"name":name,"job_title":job})
    for (ci,year,sem) in [(3,"2017","1"),(4,"2017","2"),(5,"2018","1"),(6,"2018","2")]:
        v=num(g(r,ci))
        if v is not None:
            scores.append({"staff_name":name,"job_title":job,"academic_year":year,"semester":sem,"score":v})
wb.close()
json.dump(staff,open(os.path.join(OUT,"performance_staff.json"),"w"),ensure_ascii=False,indent=1)
json.dump(scores,open(os.path.join(OUT,"performance_scores.json"),"w"),ensure_ascii=False,indent=1)
print("staff rows:",len(staff),"| score rows:",len(scores))
print("sample:",scores[:4])
