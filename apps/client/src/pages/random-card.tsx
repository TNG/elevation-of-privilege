import React, { FC } from 'react';
import Helmet from 'react-helmet';
import { Card, CardBody, CardHeader, Col, Container, Row } from 'reactstrap';
import Banner from '../components/banner/banner';

import Footer from '../components/footer/footer';
import Logo from '../components/logo/logo';
import RandomCardDisplay from '../components/randomcarddisplay/randomCardDisplay';

const RandomCard: FC = () => {
  return (
    <div>
      <Banner />
      {/* @ts-expect-error This seems to be incorrectly typed in helmet*/}
      <Helmet bodyAttributes={{ style: 'background-color : #000' }} />
      <Container className="about" fluid>
        <Row style={{ paddingTop: '20px' }}>
          <Col sm="12" md={{ size: 6, offset: 3 }}>
            <div className="text-center">
              <Logo />
            </div>
            <Card>
              <CardHeader className="text-center">Threat Modeling</CardHeader>
              <CardBody>
                <h1>Random Card</h1>
                <RandomCardDisplay />
              </CardBody>
            </Card>
          </Col>
        </Row>
        <Row>
          <Col sm="12" md={{ size: 6, offset: 3 }} className="text-center">
            <Footer />
          </Col>
        </Row>
      </Container>
    </div>
  );
};

export default RandomCard;
