describe('mock tests', function () {

  this.timeout(120000);

  it('succeeds', function (done) {
    done();
  });

  it('fails', function (done) {
    done();
  });

  it('times out', function (done) {
    this.timeout(300);
    setTimeout(done, 310);
  });

});
