import { async, inject, fakeAsync, tick, ComponentFixture, TestBed } from '@angular/core/testing';

import { FourDInterface, MD5 } from '../js44D/JSFourDInterface';
import { FourDModule } from '../fourD.module';

describe('FourDInterface Service', () => {
    let fourD: FourDInterface;

    beforeEach(() => {
        TestBed.configureTestingModule({
            imports: [FourDModule],
            providers: [FourDInterface]
        })

        fourD = TestBed.get(FourDInterface);
    })

    beforeEach(async(() => {
        FourDInterface.fourDUrl = 'http://www.vakeano.com';
    }));

    it('FourDInterface -> should get 4D version', async(() => {
        fourD.call4DRESTMethod('REST_GetApplicationVersion', {}, { responseType: 'text' })
            .subscribe((v) => {
                console.log('4D version: ' + v);
                expect(v).not.toBe('');
            });
    }));

    it('FourDInterface -> should fail invalid log into 4D', async(() => {
        fourD.signIn('foo', MD5.md5('bar')).catch(() => { // try to sign into 4D
            expect(FourDInterface.authentication).toBeFalsy('oops, valid authentication received');
            expect(FourDInterface.sessionKey).toBe('', 'opps, session key received');
        });
    }));

    it('FourDInterface -> should log into 4D', async(() => {
        fourD.signIn('admin', MD5.md5('admin')).then(() => { // try to sign into 4D
            expect(FourDInterface.currentUser).toBe('admin', 'user name not properly set!');
            expect(FourDInterface.authentication).toBeTruthy('no authentication received');
            expect(FourDInterface.authentication.options.isAdmin).toBeTruthy('user should have admin privileges');
            expect(FourDInterface.sessionKey).not.toBe('', 'no session key received');
        });
    }));
})
