"""Exercise the SQL statements extracted directly from the Android implementation.
Does not emulate Android sensor/service lifecycle or replace on-device tests.
"""
from pathlib import Path
import re, sqlite3, unittest
source=(Path(__file__).parents[1]/'modules/step-tracker/android/src/main/java/com/stepup/tracker/StepStore.kt').read_text()
sql=re.findall(r'execSQL\("([^"]+)"',source)
def query(prefix):
    return next(s for s in sql if s.startswith(prefix))
class SessionDatabaseTests(unittest.TestCase):
    def setUp(self):
        self.db=sqlite3.connect(':memory:')
        self.db.execute(query('CREATE TABLE days'))
        self.db.execute("INSERT INTO days VALUES('2026-10-06',1000,0.7,25)")
        self.db.execute(query('CREATE TABLE IF NOT EXISTS sessions'))
        self.db.execute(query('INSERT INTO sessions'),('walk-1',123456,1000))
    def row(self): return self.db.execute('SELECT status,elapsed,segment FROM sessions').fetchone()
    def test_pause_resume_excludes_break_and_saved_time_freezes(self):
        self.db.execute(query('UPDATE sessions SET elapsed'),(61000,61000))
        self.db.execute(query("UPDATE sessions SET status='paused'"))
        self.db.execute(query('UPDATE sessions SET elapsed'),(90000,90000))
        self.assertEqual(self.row(),('paused',60000,0))
        self.db.execute(query("UPDATE sessions SET status='recording'"),(121000,))
        self.db.execute(query('UPDATE sessions SET elapsed'),(181000,181000))
        self.db.execute(query("UPDATE sessions SET status='review'"))
        self.db.execute(query("UPDATE sessions SET status='saved'"))
        self.db.execute(query('UPDATE sessions SET elapsed'),(999000,999000))
        self.assertEqual(self.row(),('saved',120000,0))
    def test_interruption_retains_checkpoint_without_offline_time(self):
        self.db.execute(query('UPDATE sessions SET elapsed'),(6000,6000))
        self.db.execute(query("UPDATE sessions SET status='interrupted'"))
        self.assertEqual(self.row(),('interrupted',5000,0))
    def test_discard_and_schema_upgrade_preserve_daily_totals(self):
        self.db.execute(query("UPDATE sessions SET status='review'"))
        self.db.execute(query('DELETE FROM sessions'))
        self.assertEqual(self.db.execute('SELECT COUNT(*) FROM sessions').fetchone()[0],0)
        self.assertEqual(self.db.execute('SELECT steps FROM days').fetchone()[0],1000)
if __name__=='__main__': unittest.main()
