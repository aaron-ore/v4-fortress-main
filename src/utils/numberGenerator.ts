interface SequenceData {
  date: string;
  sequence: number;
}

const getTodayDateString = (): string => {
  const today = new Date();
  const year = today.getFullYear();
  const month = (today.getMonth() + 1).toString().padStart(2, '0');
  const day = today.getDate().toString().padStart(2, '0');
  return `${year}${month}${day}`;
};

export const generateSequentialNumber = (prefix: string): string => {
  const storageKey = `last_${prefix}_sequence`;
  const todayDate = getTodayDateString();

  let storedData: SequenceData | null = null;
  try {
    const storedString = localStorage.getItem(storageKey);
    if (storedString) {
      storedData = JSON.parse(storedString);
    }
  } catch (e) {
    console.error("Failed to parse stored sequence data:", e);
    // Fallback to default if parsing fails
    storedData = null;
  }

  let currentSequence = 1;

  if (storedData && storedData.date === todayDate) {
    currentSequence = storedData.sequence + 1;
  }

  const newSequenceData: SequenceData = {
    date: todayDate,
    sequence: currentSequence,
  };
  localStorage.setItem(storageKey, JSON.stringify(newSequenceData));

  return `${prefix}${todayDate}${String(currentSequence).padStart(3, '0')}`;
};

export const generateUniqueCode = (length: number = 8): string => {
  const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  const charactersLength = characters.length;
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * charactersLength));
  }
  return result;
};