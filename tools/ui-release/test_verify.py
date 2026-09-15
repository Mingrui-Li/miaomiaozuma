import hashlib,importlib.util,json,tempfile,unittest
from pathlib import Path
spec=importlib.util.spec_from_file_location('gate',Path(__file__).with_name('verify.py'))
gate=importlib.util.module_from_spec(spec);spec.loader.exec_module(gate)

class EvidenceIntegrity(unittest.TestCase):
    def setUp(self):
        self.tmp=tempfile.TemporaryDirectory();self.root=Path(self.tmp.name)
        (self.root/'proof.json').write_text('{"passed":true}')
        self.record={'path':'proof.json','sha256':hashlib.sha256((self.root/'proof.json').read_bytes()).hexdigest()}
    def tearDown(self):self.tmp.cleanup()
    def test_unchanged(self):self.assertEqual(gate.hash_errors(self.root,[self.record]),[])
    def test_changed(self):
        (self.root/'proof.json').write_text('{"passed":false}')
        self.assertIn('changed:',gate.hash_errors(self.root,[self.record])[0])
    def test_missing(self):
        self.record['path']='absent.json';self.assertIn('missing:',gate.hash_errors(self.root,[self.record])[0])
    def test_duplicate(self):self.assertIn('duplicate',gate.hash_errors(self.root,[self.record,self.record])[0])
    def test_empty_manifest(self):self.assertTrue(gate.hash_errors(self.root,[]))
    def test_missing_required_reports_cannot_pass(self):
        folder=self.root/'design/ui/ui08';folder.mkdir(parents=True)
        (folder/'evidence.json').write_text(json.dumps({'files':[self.record]}))
        result=gate.verify(self.root);self.assertFalse(result['releaseReady']);self.assertFalse(result['localUiBatchPassed']);self.assertGreaterEqual(len(result['errors']),8)

if __name__=='__main__':unittest.main()
