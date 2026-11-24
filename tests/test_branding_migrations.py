"""Run with python -m unittest discover -s tests -p 'test_*.py'."""
import json
import sqlite3
import unittest
from pathlib import Path


class BrandingMigrationTests(unittest.TestCase):
    def test_preserves_existing_data_and_only_upgrades_exact_template_text(self):
        db = sqlite3.connect(':memory:')
        db.execute('PRAGMA foreign_keys = ON')
        migrations = sorted(Path('migrations').glob('*.sql'))
        for path in migrations:
            if path.name < '0030':
                db.executescript(path.read_text(encoding='utf-8'))

        def insert(table, **values):
            for _, name, kind, required, default, _ in db.execute(f'PRAGMA table_info({table})'):
                if required and default is None and name not in values:
                    values[name] = 0 if kind.lower() == 'integer' else ''
            columns = ','.join(values)
            db.execute(f'INSERT INTO {table} ({columns}) VALUES ({",".join("?" for _ in values)})', tuple(values.values()))

        client = 'Idaman Creative'
        insert('brands', id='brand', name=client)
        insert('workspace_profile', id='workspace', name='Custom Agency', owner_name='Existing owner')
        insert('transactions', id='transaction', brand_id='brand', payment_account_name='Saved recipient', payment_bank_name='Saved bank', payment_account_number='1234', inventory_item_id='inventory')
        insert('inventory_items', id='inventory', linked_transaction_id='transaction')
        def intro(agency):
            return f'Terima kasih telah mempertimbangkan {agency} untuk mendukung kebutuhan {client}. Penawaran ini merangkum layanan, hasil kerja, dan investasi yang dibahas bersama.'
        custom = {'heading': 'Ringkasan kebutuhan', 'body': intro('Idaman Creative') + ' Custom addition.'}
        sections = [
            {'heading': 'Ringkasan kebutuhan', 'body': intro('Idaman Creative')},
            {'heading': 'Ringkasan kebutuhan', 'body': intro('Custom Agency')},
            custom,
            {'heading': 'Custom', 'body': 'Custom wording about Idaman Creative.'},
        ]
        insert('client_documents', id='document', brand_id='brand', sections=json.dumps(sections), status='Signed', document_number='IC-ORIGINAL-001')
        before = {table: db.execute(f'SELECT * FROM {table}').fetchall() for table in ['transactions', 'inventory_items', 'brands', 'workspace_profile']}
        original_transaction = dict(zip([row[1] for row in db.execute('PRAGMA table_info(transactions)')], before['transactions'][0]))
        for path in migrations:
            if path.name >= '0030':
                db.executescript(path.read_text(encoding='utf-8'))
        self.assertEqual(db.execute('PRAGMA foreign_key_check').fetchall(), [])
        for table in ['transactions', 'workspace_profile']:
            # Column order may change in a rebuild; compare named values.
            self.assertEqual(db.execute(f'SELECT COUNT(*) FROM {table}').fetchone()[0], len(before[table]))
        tx = dict(zip([row[1] for row in db.execute('PRAGMA table_info(transactions)')], db.execute("SELECT * FROM transactions WHERE id='transaction'").fetchone()))
        self.assertEqual(tx, original_transaction)
        self.assertEqual((tx['payment_account_name'], tx['payment_bank_name'], tx['payment_account_number'], tx['brand_id'], tx['inventory_item_id']), ('Saved recipient', 'Saved bank', '1234', 'brand', 'inventory'))
        for table in ['brands', 'inventory_items', 'workspace_profile']:
            self.assertEqual(db.execute(f'SELECT * FROM {table}').fetchall(), before[table])
        body, status, number = db.execute('SELECT sections,status,document_number FROM client_documents').fetchone()
        updated = json.loads(body)
        self.assertEqual(updated[0]['body'], intro('{{workspaceName}}'))
        self.assertEqual(updated[1]['body'], intro('{{workspaceName}}'))
        self.assertEqual(updated[2:], sections[2:])
        self.assertEqual((status, number), ('Signed', 'IC-ORIGINAL-001'))
        insert('transactions', id='new-transaction')
        self.assertEqual(db.execute("SELECT payment_account_name,payment_bank_name,payment_account_number FROM transactions WHERE id='new-transaction'").fetchone(), ('', '', ''))
        insert('workspace_profile', id='new-workspace')
        self.assertEqual(db.execute("SELECT name FROM workspace_profile WHERE id='new-workspace'").fetchone()[0], 'Agency Workspace')
        self.assertEqual(len(db.execute("SELECT name FROM sqlite_master WHERE type='index' AND name LIKE 'transactions_%'").fetchall()), 3)


if __name__ == '__main__':
    unittest.main()
