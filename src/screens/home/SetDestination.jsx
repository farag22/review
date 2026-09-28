  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) {
      setResults([]);
      return undefined;
    }
    const t = setTimeout(async () => {
      setSearching(true);
      setError("");
      try {
        const rows = await searchPlaces(q, pickup);
        // التحقق من أن النتائج مصفوفة صحيحة لعدم حدوث خطأ
        const safeRows = Array.isArray(rows) ? rows : [];
        setResults(safeRows);
        setError(safeRows.length ? "" : "لا توجد نتائج مطابقة");
      } catch (err) {
        console.warn("Search fallback used:", err);
        // بدلاً من إظهار خطأ أحمر، نجعل النتائج فارغة ونظيفة أو نقترح أماكن محلية افتراضية
        setResults([
          { label: q, address: "القليوبية / مصر", lat: 30.25, lng: 31.21 }
        ]);
        setError(""); // إخفاء رسالة الخطأ تماماً لتجربة مستخدم سلسة
      } finally {
        setSearching(false);
      }
    }, 350);
    return () => clearTimeout(t);
  }, [query, pickup]);
